"use client";

import Script from "next/script";

/**
 * Google AdSense loader. Doubles as AdSense site-ownership verification (the
 * same publisher id that lives in /ads.txt) and, once Auto ads is switched on
 * in the AdSense dashboard, serves ads. Consent is governed by the Consent
 * Mode v2 defaults set in Analytics (ad_storage stays denied until the cookie
 * banner is accepted), so no separate gating is needed here. Renders nothing
 * unless NEXT_PUBLIC_ADSENSE_CLIENT is set.
 */

const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;

export default function AdSense() {
  if (!ADSENSE_CLIENT) return null;

  return (
    <Script
      id="adsbygoogle-init"
      strategy="afterInteractive"
      crossOrigin="anonymous"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
    />
  );
}
