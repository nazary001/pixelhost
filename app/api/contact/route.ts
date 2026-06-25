import { NextResponse } from "next/server";
import { submitContact } from "@/lib/strapi";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(request: Request) {
  let body: { name?: unknown; email?: unknown; message?: unknown; website?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Honeypot tripped: pretend success so bots don't learn about the trap.
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return NextResponse.json({ ok: true });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";

  if (name.length < 2 || name.length > 80) {
    return NextResponse.json({ error: "Name must be 2–80 characters" }, { status: 400 });
  }
  if (!EMAIL_RE.test(email) || email.length > 120) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }
  if (message.length < 10 || message.length > 3000) {
    return NextResponse.json({ error: "Message must be 10–3000 characters" }, { status: 400 });
  }

  const ok = await submitContact({ name, email, request: message });
  if (!ok) {
    return NextResponse.json({ error: "Failed to store message" }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
