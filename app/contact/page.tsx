import ContactForm from "@/components/ContactForm";
import { SITE_NAME } from "@/lib/config";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Contact",
  description: `Questions, corrections or partnership ideas — here's how to reach the ${SITE_NAME} editorial team.`,
  path: "/contact",
});

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="reveal rule-double pb-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Get in <span className="u-marker">touch</span>
        </h1>
        <p className="mt-3 leading-relaxed text-moss">
          Spotted an error in a guide? Have a host, domain registrar or builder
          you think we should review? Want to work with us? Drop a note below —
          messages go straight to the editorial desk.
        </p>
      </header>

      <div className="reveal reveal-2 mt-8 border border-line bg-card p-6 sm:p-8">
        <ContactForm />
      </div>

      <p className="reveal reveal-3 mt-6 text-xs leading-relaxed text-moss">
        We use your details only to answer your message — see our{" "}
        <a href="/privacy-policy" className="text-pine underline">
          Privacy Policy
        </a>
        . You can also reach us at{" "}
        <a href="mailto:hello@pixelhost.io" className="text-pine underline">
          hello@pixelhost.io
        </a>
        .
      </p>
    </div>
  );
}
