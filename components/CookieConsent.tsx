"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

/**
 * CookieConsent — compact bottom-right consent card.
 *
 * Behaviour contract:
 *  - Renders nothing during SSR / first paint (mount-gate) to avoid hydration
 *    mismatch, and renders nothing at all if a choice is already stored.
 *  - Persists the choice for 365 days in BOTH a cookie and localStorage.
 *  - On "Accept" it dispatches a CONSENT_EVENT window event so <Analytics>
 *    can boot Google Analytics live, without a page reload.
 *  - Slides up ~600ms after mount; honours prefers-reduced-motion.
 */

export const CONSENT_EVENT = "pixelhost:consent";
export const CONSENT_STORAGE_KEY = "pixelhost_consent";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 365 days, in seconds.

type Consent = "granted" | "denied";

function persistConsent(value: Consent) {
  document.cookie = `${CONSENT_STORAGE_KEY}=${value}; max-age=${COOKIE_MAX_AGE}; path=/; SameSite=Lax`;
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, value);
  } catch {
    // localStorage may be unavailable (private mode / blocked). The cookie
    // is the source of truth, so a failure here is non-fatal.
  }
}

function readStoredConsent(): Consent | null {
  try {
    const fromStorage = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    if (fromStorage === "granted" || fromStorage === "denied") {
      return fromStorage;
    }
  } catch {
    // Ignore and fall through to the cookie.
  }
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${CONSENT_STORAGE_KEY}=(granted|denied)`),
  );
  return (match?.[1] as Consent | undefined) ?? null;
}

export default function CookieConsent() {
  // `mounted` gates rendering until after hydration; `visible` drives the
  // slide-up transition so the entrance animates from off-screen.
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (readStoredConsent() !== null) {
      // A choice already exists — render nothing, ever.
      return;
    }

    // Mount off-screen ~600ms after load, let the browser paint that state,
    // then start the slide-up transition a frame later.
    const enter = setTimeout(() => {
      setMounted(true);
      showTimer.current = setTimeout(() => setVisible(true), 50);
    }, 600);
    return () => {
      clearTimeout(enter);
      if (showTimer.current) clearTimeout(showTimer.current);
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  function dismissWith(value: Consent) {
    persistConsent(value);
    if (value === "granted") {
      // Let <Analytics> boot GA immediately, no reload needed.
      window.dispatchEvent(
        new CustomEvent(CONSENT_EVENT, { detail: { value } }),
      );
    }
    // Slide back down, then unmount after the transition settles.
    setVisible(false);
    closeTimer.current = setTimeout(() => setMounted(false), 550);
  }

  if (!mounted) return null;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Cookie notice"
      className={[
        "fixed right-4 bottom-4 z-[70] w-[min(19rem,calc(100vw-2rem))]",
        "rounded-md border border-line bg-card p-4",
        "shadow-[0_4px_12px_rgb(0_0_0_/0.10)]",
        "transition-[transform,opacity] duration-500 ease-out",
        "motion-reduce:transition-none",
        visible
          ? "translate-y-0 opacity-100"
          : "translate-y-[calc(100%+1rem)] opacity-0 motion-reduce:translate-y-0 motion-reduce:opacity-100",
      ].join(" ")}
    >
      <p className="text-[13px] leading-relaxed text-moss">
        We use a few analytics cookies to keep improving the site.{" "}
        <Link
          href="/privacy-policy"
          className="font-medium text-pine underline underline-offset-2 transition-colors hover:text-pine-deep"
        >
          Privacy Policy
        </Link>
      </p>

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => dismissWith("granted")}
          className="rounded-md bg-pine px-4 py-1.5 text-[13px] font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-pine-deep hover:shadow-[0_4px_12px_rgb(93_47_201_/0.35)] active:translate-y-0 active:shadow-none motion-reduce:transition-none motion-reduce:hover:translate-y-0"
        >
          Accept
        </button>
        <button
          type="button"
          onClick={() => dismissWith("denied")}
          className="rounded-md border border-line px-4 py-1.5 text-[13px] font-medium text-moss transition-all duration-200 hover:-translate-y-0.5 hover:border-transparent hover:bg-parchment hover:text-ink hover:shadow-[0_4px_10px_rgb(0_0_0_/0.10)] active:translate-y-0 active:shadow-none motion-reduce:transition-none motion-reduce:hover:translate-y-0"
        >
          Decline
        </button>
      </div>
    </div>
  );
}
