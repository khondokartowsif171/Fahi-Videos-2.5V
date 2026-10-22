import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const directLink = searchParams.get("url");

    if (!directLink) {
         return NextResponse.json({ error: "Missing link" }, { status: 400 });
    }

    const target=new URL(directLink);
    if(target.protocol!=='https:'||target.username||target.password||target.port) return NextResponse.json({error:'Only public HTTPS downloads are supported.'},{status:400});
    const allowed=['googlevideo.com','fbcdn.net','cdninstagram.com','storage.googleapis.com','loader.to'];
    if(!allowed.some(host=>target.hostname===host||target.hostname.endsWith('.'+host))) return NextResponse.json({error:'The media provider returned an unsupported download host.'},{status:400});
    return NextResponse.redirect(target);
}
