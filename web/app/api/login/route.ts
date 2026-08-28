import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { token } = await request.json();

  if (!process.env.DOMAIN_ACCESS_TOKEN || token !== process.env.DOMAIN_ACCESS_TOKEN) {
    return NextResponse.json({ error: "Jeton invalide." }, { status: 401 });
  }

  const cookieStore = await cookies();
  cookieStore.set("domaine_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  return NextResponse.json({ ok: true });
}
