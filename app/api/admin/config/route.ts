import { NextRequest, NextResponse } from "next/server";
import {
  AdminServerConfig,
  DEFAULT_ADMIN_EMAIL,
  readLocalAdminConfig,
  writeLocalAdminConfig,
  syncAuraAccessWithSupabase,
  fetchAuraAccessFromSupabase,
} from "@/lib/admin-config";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const email = (req.nextUrl.searchParams.get("email") || "")
    .trim()
    .toLowerCase();
  const { approvedEmails, requestedEmails } =
    await fetchAuraAccessFromSupabase();
  const local = readLocalAdminConfig();

  const isCeo = email === DEFAULT_ADMIN_EMAIL;
  const isApproved = isCeo || (email ? approvedEmails.includes(email) : false);
  const isRequested = email ? requestedEmails.includes(email) : false;

  return NextResponse.json({
    hasMasterKey: Boolean(local.geminiApiKey || process.env.GEMINI_API_KEY),
    status: isApproved ? "approved" : isRequested ? "requested" : "none",
    approvedEmails,
    requestedEmails,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body.action || "save_config";
    const local = readLocalAdminConfig();
    const { approvedEmails, requestedEmails } =
      await fetchAuraAccessFromSupabase();

    if (action === "request_aura_access") {
      const email = String(body.email || "")
        .trim()
        .toLowerCase();
      if (!email || !email.includes("@")) {
        return NextResponse.json(
          { error: "Valid user email required" },
          { status: 400 }
        );
      }
      if (approvedEmails.includes(email)) {
        return NextResponse.json({ status: "approved", approvedEmails, requestedEmails });
      }
      const nextRequested = Array.from(new Set([...requestedEmails, email]));
      writeLocalAdminConfig({
        ...local,
        approvedEmails,
        requestedEmails: nextRequested,
        updatedAt: new Date().toISOString(),
      });
      await syncAuraAccessWithSupabase(approvedEmails, nextRequested);
      return NextResponse.json({
        status: "requested",
        approvedEmails,
        requestedEmails: nextRequested,
      });
    }

    if (action === "toggle_aura_approval") {
      const email = String(body.email || "")
        .trim()
        .toLowerCase();
      if (!email || email === DEFAULT_ADMIN_EMAIL) {
        return NextResponse.json({
          status: "approved",
          approvedEmails,
          requestedEmails,
        });
      }
      const currentlyApproved = approvedEmails.includes(email);
      const nextApproved = currentlyApproved
        ? approvedEmails.filter((e) => e !== email)
        : [...approvedEmails, email];
      const nextRequested = requestedEmails.filter((e) => e !== email);

      writeLocalAdminConfig({
        ...local,
        approvedEmails: nextApproved,
        requestedEmails: nextRequested,
        updatedAt: new Date().toISOString(),
      });
      await syncAuraAccessWithSupabase(nextApproved, nextRequested);

      return NextResponse.json({
        status: !currentlyApproved ? "approved" : "none",
        approvedEmails: nextApproved,
        requestedEmails: nextRequested,
      });
    }

    if (action === "save_config") {
      const nextCfg: AdminServerConfig = {
        ...local,
        geminiApiKey:
          typeof body.geminiApiKey === "string"
            ? body.geminiApiKey.trim() || local.geminiApiKey
            : local.geminiApiKey,
        n8nWebhookUrl:
          typeof body.n8nWebhookUrl === "string"
            ? body.n8nWebhookUrl.trim()
            : local.n8nWebhookUrl,
        useN8n:
          typeof body.useN8n === "boolean" ? body.useN8n : local.useN8n,
        approvedEmails,
        requestedEmails,
        updatedAt: new Date().toISOString(),
      };
      writeLocalAdminConfig(nextCfg);
      return NextResponse.json({
        success: true,
        hasMasterKey: Boolean(nextCfg.geminiApiKey),
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Server config error" },
      { status: 500 }
    );
  }
}
