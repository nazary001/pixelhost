"use client";

import Script from "next/script";
import { useEffect } from "react";
import { CONSENT_EVENT, CONSENT_STORAGE_KEY } from "./CookieConsent";

/**
 * Analytics — Google Analytics 4 with Google Consent Mode v2.
 *
 * gtag loads for EVERY visitor (so Google can collect + model the maximum data),
 * but consent for ad/analytics storage DEFAULTS TO DENIED. When the visitor
 * accepts the cookie banner (CONSENT_EVENT "granted") consent is updated to
 * granted for full, cookie-based measurement. This is the AdSense/GDPR-recommended
 * setup. Renders null only when NEXT_PUBLIC_GA_ID is unset.
 */

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

function applyConsent(value: "granted" | "denied"): boolean {
  const w = window as unknown as { gtag?: (...args: unknown[]) => void };
  if (typeof w.gtag !== "function") return false;
  w.gtag("consent", "update", {
    ad_storage: value,
    analytics_storage: value,
    ad_user_data: value,
    ad_personalization: value,
  });
  return true;
}

function storedConsent(): "granted" | "denied" | null {
  try {
    const v = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    if (v === "granted" || v === "denied") return v;
  } catch {
    /* fall through to cookie */
  }
  const m = new RegExp(`(?:^|; )${CONSENT_STORAGE_KEY}=(granted|denied)`).exec(
    document.cookie,
  );
  return (m?.[1] as "granted" | "denied") ?? null;
}

export default function Analytics() {
  useEffect(() => {
    if (!GA_ID) return;

    let timer: ReturnType<typeof setInterval> | undefined;
    // Returning visitor who already accepted: re-grant once gtag is ready.
    if (storedConsent() === "granted") {
      let tries = 0;
      timer = setInterval(() => {
        if (applyConsent("granted") || ++tries > 40) clearInterval(timer);
      }, 100);
    }

    function onConsent(e: Event) {
      const v = (e as CustomEvent<{ value?: string }>).detail?.value;
      if (v === "granted" || v === "denied") applyConsent(v);
    }
    window.addEventListener(CONSENT_EVENT, onConsent);
    return () => {
      if (timer) clearInterval(timer);
      window.removeEventListener(CONSENT_EVENT, onConsent);
    };
  }, []);

  if (!GA_ID) return null;

  return (
    <>
      <Script id="ga-consent-default" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('consent','default',{ad_storage:'denied',analytics_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',wait_for_update:500});
gtag('set','url_passthrough',true);`}
      </Script>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_ID}');`}
      </Script>
    </>
  );
}
