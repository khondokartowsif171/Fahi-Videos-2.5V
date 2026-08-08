import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const directLink = searchParams.get("url");

    if (!directLink) {
         return NextResponse.json({ error: "Missing link" }, { status: 400 });
    }

    return NextResponse.redirect(new URL(directLink));
}
