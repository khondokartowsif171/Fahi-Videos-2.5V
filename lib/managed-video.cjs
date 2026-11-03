"use strict";
const postgres = require("postgres"),
  { GoogleGenAI } = require("@google/genai"),
  crypto = require("node:crypto"),
  fs = require("node:fs/promises"),
  path = require("node:path");
let pool;
const db = () =>
  pool ||
  (pool = postgres(process.env.STUDIO_DATABASE_URL, {
    max: 4,
    prepare: false,
  }));
const MODEL = "gemini-omni-1.1-flash",
  MB = 1024 ** 2;
class Fault extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
const fail = (status, message) => {
  throw new Fault(status, message);
};
const uuid = () => crypto.randomUUID();
function seal(value) {
  const key = crypto
    .createHash("sha256")
    .update(process.env.STUDIO_VAULT_KEY || "")
    .digest();
  if (!process.env.STUDIO_VAULT_KEY)
    fail(503, "Provider vault is unavailable.");
  const iv = crypto.randomBytes(12),
    c = crypto.createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([c.update(value), c.final()]);
  return [iv, c.getAuthTag(), data].map((x) => x.toString("base64")).join(".");
}
function open(value) {
  const [iv, tag, data] = value.split(".").map((x) => Buffer.from(x, "base64"));
  const c = crypto.createDecipheriv(
    "aes-256-gcm",
    crypto
      .createHash("sha256")
      .update(process.env.STUDIO_VAULT_KEY || "")
      .digest(),
    iv,
  );
  c.setAuthTag(tag);
  return Buffer.concat([c.update(data), c.final()]).toString();
}
const mediaRoot = () =>
  path.resolve(process.env.STUDIO_MEDIA_DIR || ".studio-media");
function assetFile(tenant, id) {
  if (!/^[a-f0-9-]{36}$/i.test(id)) fail(400, "Invalid asset ID.");
  return path.join(
    mediaRoot(),
    crypto.createHash("sha256").update(tenant).digest("hex"),
    id,
  );
}
function cycle(now = new Date()) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  return {
    key: start.toISOString().slice(0, 7),
    start,
    end: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)),
  };
}
// Customer video allowances use the existing monthly service subscription
// cycle, anchored to client_service_subscriptions.started_at. The UTC calendar
// cycle above remains the platform spend window and synthetic pilot cycle.
function serviceCycle(ctx, now = new Date()) {
  const value = ctx?.subscription?.startedAt ?? ctx?.subscription?.started_at;
  const anchor = value instanceof Date ? new Date(value) : new Date(value || NaN);
  if (!Number.isFinite(anchor.getTime()) || now < anchor) return null;
  const addMonths = (offset) => {
    const first = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + offset, 1));
    const lastDay = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
    return new Date(Date.UTC(
      first.getUTCFullYear(), first.getUTCMonth(), Math.min(anchor.getUTCDate(), lastDay),
      anchor.getUTCHours(), anchor.getUTCMinutes(), anchor.getUTCSeconds(), anchor.getUTCMilliseconds(),
    ));
  };
  let offset = (now.getUTCFullYear() - anchor.getUTCFullYear()) * 12 + now.getUTCMonth() - anchor.getUTCMonth();
  let start = addMonths(offset);
  if (start > now) start = addMonths(--offset);
  const end = addMonths(offset + 1);
  return { key: start.toISOString(), start, end };
}
function shots(seconds) {
  if (!Number.isInteger(seconds) || seconds < 4 || seconds > 30)
    fail(400, "Choose a duration between 4 and 30 seconds.");
  const parts = [];
  while (seconds > 8) {
    parts.push(8);
    seconds -= 8;
  }
  if (seconds < 3 && parts.length) {
    parts[parts.length - 1] -= 3 - seconds;
    seconds = 3;
  }
  parts.push(seconds);
  return parts;
}
function cleanPolicy(b) {
  const count = Number(b.count),
    duration = Number(b.duration),
    budget = Number(b.budget);
  if (
    !Number.isInteger(count) ||
    count < 0 ||
    count > 10000 ||
    !Number.isInteger(duration) ||
    duration < 4 ||
    duration > 30 ||
    !Number.isFinite(budget) ||
    budget < 0 ||
    budget > 100000
  )
    fail(400, "Invalid video count, duration or cycle budget.");
  return {
    enabled: b.enabled === true,
    count,
    duration,
    budget,
    model: MODEL,
    resolution: "720p",
  };
}
async function provider(sql = db()) {
  const [r] = await sql`SELECT config FROM managed_provider WHERE id=1`;
  const stored = r?.config || {
      enabled: false,
      daily: 0,
      monthly: 0,
      outputRate: 0.10136,
      inputRate: 1.5,
    };
  return {
    ...stored,
    provider: "vertex",
    project: process.env.GOOGLE_CLOUD_PROJECT || "",
    location: process.env.GOOGLE_CLOUD_LOCATION || "global",
    model: MODEL,
    credential: null,
    projectConfigured: !!process.env.GOOGLE_CLOUD_PROJECT,
  };
}
async function policyFor(ctx, sql = db()) {
  const c = serviceCycle(ctx),
    s = ctx.subscription;
  if (!c || !s || !["active", "trial"].includes(s.status))
    return { enabled: false, count: 0, duration: 20, budget: 0 };
  const scopes = [
    "subscription:" + s.id,
    ...(s.tierId ? ["tier:" + s.tierId] : []),
    "service:" + s.serviceId,
  ];
  const rows =
    await sql`SELECT * FROM managed_policies WHERE scope=ANY(${scopes}) AND (NOT next_cycle OR created_at<${c.start}) ORDER BY created_at DESC`;
  for (const scope of scopes) {
    const row = rows.find((r) => r.scope === scope);
    if (row) return { ...row.config, version: row.id, scope };
  }
  return { enabled: false, count: 0, duration: 20, budget: 0 };
}
const occupiedStates = [
  "queued",
  "running",
  "confirmation_pending",
  "composing",
  "completed",
];
async function allowance(ctx, sql = db()) {
  const c = serviceCycle(ctx);
  if (!c) return { enabled: false, count: 0, duration: 20, budget: 0, total: 0, used: 0, reserved: 0, remaining: 0, resetAt: null, cycle: null };
  const p = await policyFor(ctx, sql),
    [u] =
      await sql`SELECT count(*) FILTER(WHERE state='completed')::int AS used,count(*) FILTER(WHERE state IN ('queued','running','confirmation_pending','composing'))::int AS reserved FROM managed_jobs WHERE tenant=${ctx.tenant} AND (cycle=${c.key} OR (created_at>=${c.start} AND created_at<${c.end}))`;
  const [g] =
    await sql`SELECT coalesce(sum(amount),0)::int AS n FROM managed_grants WHERE tenant=${ctx.tenant} AND (cycle=${c.key} OR (created_at>=${c.start} AND created_at<${c.end}))`;
  const total = p.enabled ? p.count + g.n : 0;
  return {
    ...p,
    total,
    used: u.used,
    reserved: u.reserved,
    remaining: Math.max(0, total - u.used - u.reserved),
    resetAt: c.end.toISOString(),
    cycle: c.key,
  };
}
function normalizeInput(b) {
  const prompt = String(b.prompt || "").trim();
  if (!prompt || prompt.length > 6000)
    fail(400, "A prompt of 1–6000 characters is required.");
  const seconds = Number(b.duration || 8),
    parts = shots(seconds);
  const refs = b.assetIds || [];
  if (
    !Array.isArray(refs) ||
    refs.length > 3 ||
    refs.some((x) => typeof x !== "string" || !/^[a-f0-9-]{36}$/i.test(x))
  )
    fail(400, "Use up to three workspace image assets.");
  return {
    prompt,
    duration: seconds,
    shots: parts,
    aspectRatio: b.aspectRatio === "9:16" ? "9:16" : "16:9",
    assetIds: refs,
  };
}
function estimate(input, p) {
  const output = input.duration * Number(p.outputRate || 0.10136);
  const inputEstimate =
    ((input.prompt.length * input.shots.length +
      input.assetIds.length * input.shots.length * 1120) *
      Number(p.inputRate || 1.5)) /
    1e6;
  return {
    outputUsd: output,
    inputEstimateUsd: inputEstimate,
    reserveUsd: Math.ceil((output + inputEstimate + 0.05) * 1.35 * 100) / 100,
    shots: input.shots,
    model: MODEL,
    resolution: "720p",
    rateSnapshot: { outputRate: p.outputRate, inputRate: p.inputRate },
  };
}
function hasCurrentAccessCheck(p) {
  const check = p?.accessCheck;
  return !!(
    p?.projectConfigured &&
    check?.available === true &&
    check.model === MODEL &&
    check.project === p.project &&
    check.location === p.location
  );
}
async function acceptedPilot(sql, p) {
  if (!/^[a-f0-9-]{36}$/i.test(p?.pilotAcceptedJobId || "")) return null;
  const [job] = await sql`SELECT id FROM managed_jobs WHERE id=${p.pilotAcceptedJobId} AND tenant='__omni_pilot__' AND state='completed' AND asset_id IS NOT NULL AND policy->>'model'=${MODEL} AND policy->>'vertexProject'=${p.project} AND policy->>'vertexLocation'=${p.location} LIMIT 1`;
  return job || null;
}
async function submit(ctx, b, requestId, { pilot = false } = {}) {
  const input = normalizeInput(b);
  if (!/^[a-f0-9-]{36}$/i.test(requestId || ""))
    fail(400, "A unique request ID is required.");
  const sql = db(),
    hash = crypto
      .createHash("sha256")
      .update(JSON.stringify(input))
      .digest("hex"),
    c = pilot ? cycle() : serviceCycle(ctx);
  if (!c) fail(409, "The workspace video subscription has no verifiable billing-cycle start date.");
  return sql.begin(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(66390122)`; // Same storage lock as streamed uploads.
    const [existing] =
      await tx`SELECT id,request_hash,state FROM managed_jobs WHERE tenant=${ctx.tenant} AND request_id=${requestId}`;
    if (existing) {
      if (existing.request_hash !== hash)
        fail(409, "Request ID was used with different input.");
      return { id: existing.id, state: existing.state, reused: true };
    }
    const cfg = await provider(tx),
      a = pilot
        ? {
            enabled: true,
            total: 1,
            remaining: 1,
            duration: 20,
            budget: 5,
            cycle: c.key,
          }
        : await allowance(ctx, tx);
    if (!cfg.projectConfigured) fail(503, "Vertex project is not configured in Coolify.");
    if (!hasCurrentAccessCheck(cfg))
      fail(409, "Run a successful no-cost Vertex access check for the current project and model before the paid pilot.");
    if (!pilot && !cfg.enabled)
      fail(503, "Managed video generation is paused by Aura.");
    if (!pilot && !(await acceptedPilot(tx, cfg)))
      fail(409, "A synthetic paid pilot must complete and be explicitly accepted before client generation.");
    if (!a.enabled) fail(403, "Managed video is not assigned to this package.");
    if (!a.remaining)
      fail(
        409,
        "Video allowance is exhausted. Upgrade or ask your Aura administrator.",
      );
    if (input.duration > a.duration)
      fail(400, "This duration exceeds your package.");
    const e = estimate(input, cfg);
    if (pilot && e.reserveUsd > 5)
      fail(409, "The paid test would exceed the $5 submission budget.");
    const [spend] =
      await tx`SELECT coalesce(sum(greatest(cost_usd,reserve_usd)) FILTER(WHERE created_at>=date_trunc('day',now()) AND state NOT IN ('cancelled','failed')),0)+coalesce(sum(cost_usd) FILTER(WHERE created_at>=date_trunc('day',now()) AND state IN ('cancelled','failed')),0) AS day,coalesce(sum(greatest(cost_usd,reserve_usd)) FILTER(WHERE created_at>=date_trunc('month',now()) AND state NOT IN ('cancelled','failed')),0)+coalesce(sum(cost_usd) FILTER(WHERE created_at>=date_trunc('month',now()) AND state IN ('cancelled','failed')),0) AS month,coalesce(sum(greatest(cost_usd,reserve_usd)) FILTER(WHERE tenant=${ctx.tenant} AND (cycle=${c.key} OR (created_at>=${c.start} AND created_at<${c.end})) AND state NOT IN ('cancelled','failed')),0)+coalesce(sum(cost_usd) FILTER(WHERE tenant=${ctx.tenant} AND (cycle=${c.key} OR (created_at>=${c.start} AND created_at<${c.end})) AND state IN ('cancelled','failed')),0) AS own FROM managed_jobs`;
    if (
      Number(spend.own) + e.reserveUsd > a.budget ||
      (!pilot &&
        (Number(spend.day) + e.reserveUsd > cfg.daily ||
          Number(spend.month) + e.reserveUsd > cfg.monthly))
    )
      fail(
        409,
        "Application generation budget reached. No provider request was sent.",
      );
    if (pilot) {
      const [n] =
        await tx`SELECT coalesce(sum(greatest(cost_usd,reserve_usd)),0) AS n FROM managed_jobs WHERE tenant='__omni_pilot__'`;
      if (Number(n.n) + e.reserveUsd > 5)
        fail(409, "The $5 paid acceptance budget is already reserved or used.");
    }
    for (const id of input.assetIds) {
      const [asset] =
        await tx`SELECT id FROM studio_assets WHERE id=${id} AND tenant=${ctx.tenant} AND status='ready' AND mime LIKE 'image/%' AND bytes<=${10 * MB}`;
      if (!asset) fail(404, "Reference image not found in this workspace.");
    }
    const bytes = 512 * MB,
      [storage] =
        await tx`SELECT coalesce(sum(bytes),0)::bigint AS total,coalesce(sum(bytes) FILTER(WHERE tenant=${ctx.tenant}),0)::bigint AS own FROM studio_assets`;
    const [reserved] =
      await tx`SELECT coalesce(sum(reserved_bytes),0)::bigint AS total,coalesce(sum(reserved_bytes) FILTER(WHERE tenant=${ctx.tenant}),0)::bigint AS own FROM managed_jobs WHERE state IN ('queued','running','confirmation_pending','composing')`;
    await fs.mkdir(mediaRoot(), { recursive: true });
    const disk = await fs.statfs(mediaRoot());
    if (
      Number(storage.own) + Number(reserved.own) + bytes > 1024 ** 3 ||
      Number(storage.total) + Number(reserved.total) + bytes > 10 * 1024 ** 3
    )
      fail(413, "Studio storage is full.");
    if (
      disk.bavail * disk.bsize - Number(reserved.total) - bytes <
      10 * 1024 ** 3
    )
      fail(507, "Studio disk reserve reached.");
    const id = uuid();
    await tx`INSERT INTO managed_jobs(id,tenant,actor,cycle,request_id,request_hash,input,policy,credential_id,reserve_usd,reserved_bytes) VALUES(${id},${ctx.tenant},${ctx.actor},${c.key},${requestId},${hash},${tx.json(input)},${tx.json({ ...a, ...e, provider: "vertex", vertexProject: cfg.project, vertexLocation: cfg.location })},NULL,${e.reserveUsd},${bytes})`;
    return { id, state: "queued", estimate: e };
  });
}
async function publicApi(req, ctx, parts) {
  try {
    const route = parts.join("/"),
      sql = db();
    if (route === "allowance" && req.method === "GET")
      return Response.json(await allowance(ctx));
    if (!["owner", "admin", "manager", "agent"].includes(ctx.role))
      fail(403, "Workspace editing is not allowed.");
    if (route === "estimate" && req.method === "POST") {
      const input = normalizeInput(await req.json()),
        a = await allowance(ctx);
      if (!a.enabled)
        fail(403, "Managed video is not assigned to this package.");
      if (input.duration > a.duration)
        fail(400, "Duration exceeds your package.");
      return Response.json({
        ...estimate(input, await provider()),
        allowance: a,
        storyboard: input.shots.map((duration, i) => ({
          shot: i + 1,
          duration,
          prompt: input.prompt,
        })),
      });
    }
    if (route === "jobs" && req.method === "POST")
      return Response.json(
        await submit(ctx, await req.json(), req.headers.get("x-request-id")),
        { status: 202 },
      );
    if (route === "jobs" && req.method === "GET") {
      const jobs =
        await sql`SELECT id,state,error,asset_id,created_at,input->>'duration' AS duration FROM managed_jobs WHERE tenant=${ctx.tenant} ORDER BY created_at DESC LIMIT 30`;
      return Response.json({ jobs });
    }
    if (parts[0] === "jobs" && parts[1]) {
      if (!/^[a-f0-9-]{36}$/i.test(parts[1])) fail(404, "Video job not found.");
      const [j] =
        await sql`SELECT id,state,error,asset_id,created_at,input,usage FROM managed_jobs WHERE id=${parts[1]} AND tenant=${ctx.tenant}`;
      if (!j) fail(404, "Video job not found.");
      if (parts[2] === "cancel" && req.method === "POST") {
        await sql`UPDATE managed_jobs SET state=CASE WHEN state='queued' THEN 'cancelled' ELSE state END,reserved_bytes=CASE WHEN state='queued' THEN 0 ELSE reserved_bytes END,cancel_requested=true,updated_at=now() WHERE id=${j.id} AND state IN ('queued','running','confirmation_pending')`;
        return Response.json({ cancelRequested: true });
      }
      if (req.method === "GET")
        return Response.json({
          ...j,
          assetUrl: j.asset_id
            ? "/api/fahi/assets/" + j.asset_id + "?download=1"
            : null,
        });
    }
    fail(404, "Unknown video endpoint.");
  } catch (e) {
    return Response.json(
      { error: e.status ? e.message : "Video request failed." },
      { status: e.status || 503 },
    );
  }
}
async function audit(actor, action, detail) {
  await db()`INSERT INTO managed_audit(id,actor,action,detail) VALUES(${uuid()},${actor},${action},${db().json(detail)})`;
}
const CONTROL_AUDITED_ACTIONS = new Set([
  "settings",
  "pilot",
  "accept-pilot",
  "policy",
  "grant",
]);
function validateControlAuditMetadata(action, body) {
  if (!CONTROL_AUDITED_ACTIONS.has(action)) return null;
  const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
  const requestId = typeof body?.requestId === "string" ? body.requestId : "";
  if (
    reason.length < 8 ||
    reason.length > 500 ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)
  )
    fail(400, "A reason (8–500 characters) and valid request ID are required for this control action.");
  return { reason, requestId };
}
async function control(req, actor) {
  const sql = db(),
    body = req.method === "GET" ? {} : await req.json();
  const controlAudit = validateControlAuditMetadata(body?.action, body);
  if (req.method === "GET" && new URL(req.url).searchParams.has("download")) {
    const id = new URL(req.url).searchParams.get("download");
    if (!/^[a-f0-9-]{36}$/i.test(id || "")) fail(404, "Video not found.");
    const [j] =
      await sql`SELECT tenant,asset_id FROM managed_jobs WHERE id=${id} AND state='completed'`;
    if (!j?.asset_id) fail(404, "Completed video not found.");
    await audit(actor, "admin_video_download", { jobId: id });
    const { Readable } = require("node:stream"),
      { createReadStream } = require("node:fs");
    return new Response(
      Readable.toWeb(createReadStream(assetFile(j.tenant, j.asset_id))),
      {
        headers: {
          "Content-Type": "video/mp4",
          "Content-Disposition": 'attachment; filename="aura-omni-video.mp4"',
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
  }
  if (req.method === "GET") {
    const p = await provider(),
      policies =
        await sql`SELECT id,scope,config,next_cycle,created_at FROM managed_policies ORDER BY created_at DESC LIMIT 100`,
      jobs =
        await sql`SELECT id,tenant,state,error,cost_usd,reserve_usd,usage,created_at,asset_id FROM managed_jobs ORDER BY created_at DESC LIMIT 50`;
    return Response.json({
      provider: { ...p, credential: undefined, projectConfigured: p.projectConfigured },
      policies,
      jobs,
    });
  }
  if (body.action === "settings") {
    const p = await provider();
    for (const k of ["daily", "monthly"])
      if (!Number.isFinite(Number(body[k])) || Number(body[k]) < 0)
        fail(400, "Positive budget limits are required.");
    if (body.enabled === true && !p.projectConfigured)
      fail(503, "Set the Google Cloud project in Coolify first, then run the no-cost access check.");
    if (body.enabled === true && !hasCurrentAccessCheck(p))
      fail(409, "Run a successful no-cost Vertex access check for the current project and model first.");
    if (body.enabled === true && !(await acceptedPilot(sql, p)))
      fail(409, "Client generation stays paused until a synthetic paid pilot completes and an Admin accepts its output.");
    const config = {
      ...p,
      enabled: body.enabled === true,
      daily: Number(body.daily),
      monthly: Number(body.monthly),
      outputRate: 0.10136,
      inputRate: 1.5,
      credential: null,
      provider: "vertex",
      model: MODEL,
    };
    await sql`INSERT INTO managed_provider(id,config) VALUES(1,${sql.json(config)}) ON CONFLICT(id) DO UPDATE SET config=excluded.config,updated_at=now()`;
    await audit(actor, "provider_settings", {
      ...controlAudit,
      enabled: config.enabled,
      provider: config.provider,
      projectConfigured: p.projectConfigured,
    });
    return Response.json({ ok: true });
  }
  if (body.action === "check") {
    const p = await provider();
    if (!p.projectConfigured) fail(503, "Vertex project is not configured in Coolify.");
    let httpStatus = 200,
      available = false;
    try {
      const ai = new GoogleGenAI({
        vertexai: true,
        project: p.project,
        location: p.location,
        httpOptions: { timeout: 30000, retryOptions: { attempts: 1 } },
      });
      const model = await ai.models.get({ model: MODEL });
      available = !!model;
    } catch (error) {
      httpStatus = Number.isInteger(error?.status) ? error.status : 503;
    }
    const accessCheck = {
      available,
      httpStatus,
      model: MODEL,
      project: p.project,
      location: p.location,
      checkedAt: new Date().toISOString(),
    };
    const nextConfig = { ...p, accessCheck, enabled: available ? p.enabled : false };
    await sql`INSERT INTO managed_provider(id,config) VALUES(1,${sql.json(nextConfig)}) ON CONFLICT(id) DO UPDATE SET config=excluded.config,updated_at=now()`;
    await audit(actor, "provider_access_check", { httpStatus, available, provider: "vertex", model: MODEL });
    return Response.json({
      provider: "vertex",
      model: MODEL,
      httpStatus,
      available,
      checkedAt: accessCheck.checkedAt,
      paidRenderTested: false,
      ...(available ? {} : { error: "Vertex access check failed. Verify Coolify runtime identity, Vertex API access and model availability." }),
    });
  }
  if (body.action === "accept-pilot") {
    if (!/^[a-f0-9-]{36}$/i.test(body.jobId || ""))
      fail(400, "Choose a completed synthetic pilot job.");
    const p = await provider();
    if (!hasCurrentAccessCheck(p))
      fail(409, "Run a successful no-cost Vertex access check for the current project and model first.");
    const [job] = await sql`SELECT id FROM managed_jobs WHERE id=${body.jobId} AND tenant='__omni_pilot__' AND state='completed' AND asset_id IS NOT NULL AND policy->>'model'=${MODEL} AND policy->>'vertexProject'=${p.project} AND policy->>'vertexLocation'=${p.location} LIMIT 1`;
    if (!job) fail(404, "A completed pilot output for the current Vertex project was not found.");
    const config = { ...p, pilotAcceptedJobId: job.id };
    await sql`INSERT INTO managed_provider(id,config) VALUES(1,${sql.json(config)}) ON CONFLICT(id) DO UPDATE SET config=excluded.config,updated_at=now()`;
    await audit(actor, "paid_pilot_output_accepted", { ...controlAudit, jobId: job.id, model: MODEL, project: p.project, location: p.location });
    return Response.json({ ok: true, jobId: job.id });
  }
  if (body.action === "policy") {
    if (!/^(service|tier|subscription):[a-f0-9-]{36}$/i.test(body.scope || ""))
      fail(400, "Choose a verified service, tier or subscription.");
    const p = cleanPolicy(body),
      [old] =
        await sql`SELECT config FROM managed_policies WHERE scope=${body.scope} ORDER BY created_at DESC LIMIT 1`;
    const next =
      p.enabled &&
      !!old &&
      (p.count < old.config.count ||
        p.duration < old.config.duration ||
        p.budget < old.config.budget);
    await sql`INSERT INTO managed_policies(id,scope,config,next_cycle,actor) VALUES(${uuid()},${body.scope},${sql.json(p)},${next},${actor})`;
    await audit(actor, "package_video_policy", {
      ...controlAudit,
      scope: body.scope,
      nextCycle: next,
      ...p,
    });
    return Response.json({ ok: true, nextCycle: next });
  }
  if (body.action === "grant") {
    if (
      !Number.isInteger(body.amount) ||
      body.amount < 1 ||
      body.amount > 1000 ||
      !body.tenant ||
      !String(body.reason || "").trim()
    )
      fail(400, "A client, amount and reason are required.");
    const grantTargets = await sql`SELECT DISTINCT video.id,video.started_at AS "startedAt"
      FROM client_service_subscriptions target
      JOIN clients c ON c.id=target.client_id
      JOIN client_service_subscriptions video ON video.client_id=c.id
      JOIN services sv ON sv.id=video.service_id AND sv.slug='video-ad-studio'
      WHERE target.config->>'tenant'=${body.tenant}
        AND target.status IN ('active','trial') AND video.status IN ('active','trial')
      ORDER BY video.id LIMIT 2`;
    if (grantTargets.length !== 1) fail(409, "A unique active video subscription and billing cycle could not be resolved for this workspace.");
    const grantCycle = serviceCycle({ subscription: grantTargets[0] });
    if (!grantCycle) fail(409, "The workspace video subscription has no verifiable billing-cycle start date.");
    await sql`INSERT INTO managed_grants(id,tenant,cycle,amount,actor,reason) VALUES(${uuid()},${body.tenant},${grantCycle.key},${body.amount},${actor},${String(body.reason).slice(0, 500)})`;
    await audit(actor, "video_grant", {
      ...controlAudit,
      tenant: body.tenant,
      amount: body.amount,
    });
    return Response.json({ ok: true });
  }
  if (body.action === "pilot") {
    const result = await submit(
      { tenant: "__omni_pilot__", actor, role: "admin" },
      {
        prompt:
          "A clean abstract cyan and violet glass sculpture rotates slowly on a neutral studio background. No people, brands, text or speech. Soft ambient sound. Each shot is a different deliberate camera view of the same sculpture.",
        duration: 20,
        aspectRatio: "16:9",
      },
      body.requestId,
      { pilot: true },
    );
    await audit(actor, "paid_acceptance_submit", {
      ...controlAudit,
      jobId: result.id,
      budget: 5,
    });
    return Response.json(result, { status: 202 });
  }
  fail(400, "Unknown control action.");
}
async function takeProcessingLock(wait = false) {
  const lock = await db().reserve();
  let acquired = false;
  try {
    const end = Date.now() + 180000;
    do {
      const [r] = await lock`SELECT pg_try_advisory_lock(66390126) AS ok`;
      if (r.ok) {
        acquired = true;
        return async () => {
          try {
            await lock`SELECT pg_advisory_unlock(66390126)`;
          } finally {
            lock.release();
          }
        };
      }
      if (!wait || Date.now() > end)
        fail(429, "Another video is processing. Try again shortly.");
      await new Promise((r) => setTimeout(r, 2000));
    } while (true);
  } finally {
    if (!acquired) lock.release();
  }
}
module.exports = {
  takeProcessingLock,
  db,
  open,
  seal,
  assetFile,
  mediaRoot,
  cycle,
  serviceCycle,
  shots,
  estimate,
  hasCurrentAccessCheck,
  acceptedPilot,
  validateControlAuditMetadata,
  normalizeInput,
  policyFor,
  allowance,
  submit,
  publicApi,
  control,
  Fault,
  MODEL,
};
