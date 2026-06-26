import { SITE_NAME, SITE_URL } from "@/lib/config";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Privacy Policy",
  description: `How ${SITE_NAME} collects, uses and protects information about its visitors.`,
  path: "/privacy-policy",
});

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="rule-double pb-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Privacy Policy
        </h1>
        <p className="tag-cap mt-3">Last updated: June 26, 2026</p>
      </header>

      <div className="article-body mt-8">
        <p>
          This Privacy Policy explains what information {SITE_NAME} (“we”, “us”)
          collects when you visit {SITE_URL}, why we collect it, and the choices
          you have.
        </p>

        <h2>Information we collect</h2>
        <ul>
          <li>
            <strong>Contact form data.</strong> If you write to us, we store the
            name, email address and message you submit so we can respond.
          </li>
          <li>
            <strong>Usage data.</strong> Like most websites, we may use analytics
            tools that collect anonymized information about how visitors use the
            site — pages viewed, approximate location, device and browser type.
          </li>
          <li>
            <strong>Cookies.</strong> Analytics and advertising partners may set
            cookies to recognize repeat visits. You can block or delete cookies
            in your browser settings at any time.
          </li>
        </ul>

        <h2>How we use information</h2>
        <ul>
          <li>To operate, maintain and improve the website and its content.</li>
          <li>To respond to messages you send us.</li>
          <li>To measure which guides are useful and plan new material.</li>
        </ul>

        <h2>What we don&apos;t do</h2>
        <p>
          We do not sell your personal information, and we do not use the
          contact form data for marketing emails.
        </p>

        <h2>Advertising and third-party cookies</h2>
        <p>
          Third-party vendors, including Google, use cookies to serve ads based
          on a user&apos;s prior visits to this and other websites. Google&apos;s
          use of advertising cookies enables it and its partners to serve ads to
          our visitors based on their visit to this site and/or other sites on
          the internet.
        </p>
        <p>
          Visitors may opt out of personalized advertising by visiting{" "}
          <a
            href="https://www.google.com/settings/ads"
            rel="nofollow noopener"
            target="_blank"
          >
            Google Ads Settings
          </a>
          . You can also opt out of a third-party vendor&apos;s use of cookies
          for personalized advertising by visiting{" "}
          <a
            href="https://www.aboutads.info/choices/"
            rel="nofollow noopener"
            target="_blank"
          >
            aboutads.info
          </a>
          . In the EEA, the UK and Switzerland, advertising and analytics cookies
          are set only after you grant consent through our cookie banner.
        </p>
        <p>
          We also use analytics tools such as Google Analytics to understand how
          visitors use the site. These providers process data under their own
          privacy policies. Links to external websites are likewise governed by
          the privacy practices of those sites.
        </p>

        <h2>Data retention</h2>
        <p>
          Contact messages are kept only as long as needed to handle your
          request. Aggregated analytics data is retained per the provider&apos;s
          standard settings.
        </p>

        <h2>Your rights</h2>
        <p>
          You may request access to, correction of, or deletion of the personal
          data you submitted to us. To do so, reach out through the{" "}
          <a href="/contact">contact page</a>.
        </p>

        <h2>Changes to this policy</h2>
        <p>
          We may update this policy from time to time. The date at the top of
          the page reflects the latest revision.
        </p>
      </div>
    </div>
  );
}
