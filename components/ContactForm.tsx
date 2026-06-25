"use client";

import { useState } from "react";

type Status = "idle" | "sending" | "sent" | "error";

export default function ContactForm() {
  const [status, setStatus] = useState<Status>("idle");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);

    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          email: data.get("email"),
          message: data.get("message"),
          // Honeypot: hidden from humans, validated server-side.
          website: data.get("website"),
        }),
      });
      if (!res.ok) throw new Error("Request failed");
      setStatus("sent");
      form.reset();
    } catch {
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div role="status" className="border border-pine bg-card p-8 text-center">
        <p className="font-display text-2xl font-semibold text-pine">
          Message received ✓
        </p>
        <p className="mt-2 text-sm text-moss">
          Thanks for writing in — we read every message and reply when a response
          is needed.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="tag-cap mb-2 block">Your name</span>
          <input
            type="text"
            name="name"
            required
            minLength={2}
            maxLength={80}
            placeholder="Jane Doe"
            className="field"
          />
        </label>
        <label className="block">
          <span className="tag-cap mb-2 block">Email</span>
          <input
            type="email"
            name="email"
            required
            maxLength={120}
            placeholder="you@example.com"
            className="field"
          />
        </label>
      </div>
      <label className="block">
        <span className="tag-cap mb-2 block">Message</span>
        <textarea
          name="message"
          required
          minLength={10}
          maxLength={3000}
          rows={6}
          placeholder="What's on your mind?"
          className="field resize-y"
        />
      </label>

      {status === "error" && (
        <p role="alert" className="border border-red-700/40 bg-red-50 px-4 py-3 text-sm text-red-800">
          Something went wrong while sending — please try again in a minute.
        </p>
      )}

      <button type="submit" disabled={status === "sending"} className="btn-pine disabled:opacity-60">
        {status === "sending" ? "Sending…" : "Send message"}
        <span aria-hidden="true">→</span>
      </button>
    </form>
  );
}
