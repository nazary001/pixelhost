import { SITE_NAME, SITE_URL } from "@/lib/config";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Terms of Use",
  description: `The terms and conditions that apply when you use ${SITE_NAME}.`,
  path: "/terms-of-use",
});

export default function TermsOfUsePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="rule-double pb-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Terms of Use
        </h1>
        <p className="tag-cap mt-3">Last updated: June 10, 2026</p>
      </header>

      <div className="article-body mt-8">
        <p>
          By accessing {SITE_URL} (the “Site”), you agree to these Terms of Use.
          If you do not agree with them, please do not use the Site.
        </p>

        <h2>Informational purpose only</h2>
        <p>
          All content on the Site — explainers, how-tos, reviews and guides — is
          published for general informational purposes. It is{" "}
          <strong>not</strong> professional, technical or legal advice. Hosting
          plans, domain pricing, features and policies change; always verify
          current conditions directly with the provider before making decisions.
        </p>

        <h2>No professional relationship</h2>
        <p>
          Reading the Site or contacting us does not create an advisory or
          client relationship. Decisions you make based on our content are your
          own responsibility.
        </p>

        <h2>Intellectual property</h2>
        <p>
          The articles, design and other original materials on the Site belong
          to {SITE_NAME} unless stated otherwise. You may share short excerpts
          with a link back to the source; republishing full articles without
          permission is not allowed.
        </p>

        <h2>Third-party links</h2>
        <p>
          The Site links to external websites — hosting providers, domain
          registrars, official resources. We are not responsible for their
          content, accuracy or practices. Some pages may contain partner links,
          which are disclosed where they appear.
        </p>

        <h2>Limitation of liability</h2>
        <p>
          The Site is provided “as is”, without warranties of any kind. To the
          maximum extent permitted by law, {SITE_NAME} is not liable for losses
          arising from the use of, or inability to use, the Site or its content.
        </p>

        <h2>Changes</h2>
        <p>
          We may revise these Terms at any time by updating this page. Continued
          use of the Site after changes means you accept the revised Terms.
        </p>

        <h2>Contact</h2>
        <p>
          Questions about these Terms? Use the <a href="/contact">contact page</a>.
        </p>
      </div>
    </div>
  );
}
