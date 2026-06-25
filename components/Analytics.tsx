"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import { CONSENT_EVENT, CONSENT_STORAGE_KEY } from "./CookieConsent";

/**
 * Analytics — consent-gated Google Analytics loader.
 *
 * Renders the gtag <Script> tags ONLY when:
 *   1. NEXT_PUBLIC_GA_ID is configured, AND
 *   2. the visitor has granted consent (stored cookie/localStorage, or the
 *      live CONSENT_EVENT dispatched by <CookieConsent> on Accept).
 *
 * If GA_ID is unset it renders null. It reacts to consent live, so GA boots
 * the moment the user clicks Accept — no page reload required.
 */

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

function hasGrantedConsent(): boolean {
  try {
    if (window.localStorage.getItem(CONSENT_STORAGE_KEY) === "granted") {
      return true;
    }
  } catch {
    // Fall through to the cookie.
  }
  return new RegExp(`(?:^|; )${CONSENT_STORAGE_KEY}=granted`).test(
    document.cookie,
  );
}

export default function Analytics() {
  const [granted, setGranted] = useState(false);

  useEffect(() => {
    if (!GA_ID) return;

    // Check stored consent asynchronously (post-paint) to avoid a cascading
    // render inside the effect body; boot live on the banner's Accept event.
    const check = setTimeout(() => {
      if (hasGrantedConsent()) setGranted(true);
    }, 0);

    function onConsent(event: Event) {
      const detail = (event as CustomEvent<{ value?: string }>).detail;
      if (detail?.value === "granted") setGranted(true);
    }
    window.addEventListener(CONSENT_EVENT, onConsent);
    return () => {
      clearTimeout(check);
      window.removeEventListener(CONSENT_EVENT, onConsent);
    };
  }, []);

  if (!GA_ID || !granted) return null;

  return (
    <>
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
