"use strict";
const assert = require("node:assert/strict");
const { MODEL, hasCurrentAccessCheck, acceptedPilot, serviceCycle, validateControlAuditMetadata } = require("../lib/managed-video.cjs");
assert.equal(MODEL, "gemini-omni-1.1-flash", "managed video must use the stable Omni model");

const provider = {
  projectConfigured: true,
  project: "fixture-project",
  location: "global",
  accessCheck: {
    available: true,
    model: MODEL,
    project: "fixture-project",
    location: "global",
  },
};
assert.equal(hasCurrentAccessCheck(provider), true);
assert.equal(hasCurrentAccessCheck({ ...provider, project: "changed-project" }), false);
assert.equal(hasCurrentAccessCheck({ ...provider, location: "us-central1" }), false);
assert.equal(hasCurrentAccessCheck({ ...provider, accessCheck: { ...provider.accessCheck, available: false } }), false);
assert.equal(hasCurrentAccessCheck({ ...provider, accessCheck: { ...provider.accessCheck, model: "stale-model" } }), false);

const anchor = new Date("2026-01-31T08:30:00.000Z");
const beforeClampBoundary = serviceCycle({ subscription: { startedAt: anchor } }, new Date("2026-02-28T08:29:59.999Z"));
assert.equal(beforeClampBoundary.start.toISOString(), "2026-01-31T08:30:00.000Z");
assert.equal(beforeClampBoundary.end.toISOString(), "2026-02-28T08:30:00.000Z");
const atClampBoundary = serviceCycle({ subscription: { startedAt: anchor } }, new Date("2026-02-28T08:30:00.000Z"));
assert.equal(atClampBoundary.start.toISOString(), "2026-02-28T08:30:00.000Z");
assert.equal(atClampBoundary.end.toISOString(), "2026-03-31T08:30:00.000Z");
assert.equal(serviceCycle({ subscription: {} }, new Date("2026-02-28T08:30:00.000Z")), null);

const pilotId = "11111111-1111-4111-8111-111111111111";
const sql = async (_parts, id, model, project, location) => {
  assert.deepEqual([id, model, project, location], [pilotId, MODEL, provider.project, provider.location]);
  return [{ id: pilotId }];
};
(async () => {
  const requestId = "123e4567-e89b-42d3-a456-426614174000";
  assert.deepEqual(validateControlAuditMetadata("settings", { reason: "  update monthly ceiling  ", requestId }), {
    reason: "update monthly ceiling",
    requestId,
  });
  assert.equal(validateControlAuditMetadata("check", {}), null, "no-cost access checks do not require mutation audit metadata");
  assert.throws(() => validateControlAuditMetadata("grant", { reason: "short", requestId }), (error) => error.status === 400);
  assert.throws(() => validateControlAuditMetadata("pilot", { reason: "approved paid pilot" }), (error) => error.status === 400);
  assert.equal((await acceptedPilot(sql, { ...provider, pilotAcceptedJobId: pilotId })).id, pilotId);
  assert.equal(await acceptedPilot(sql, { ...provider, pilotAcceptedJobId: null }), null);
  console.log("Managed video access-check freshness, accepted-pilot policy and anchored subscription-cycle boundaries passed.");
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
