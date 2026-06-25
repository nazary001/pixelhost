import { SITE_NAME } from "@/lib/config";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Acceptable use policy",
  description: `The acceptable use and fair-use policy for ${SITE_NAME} hosting services: resource limits, email rules, prohibited uses, and how unmetered and lifetime plans work.`,
  path: "/acceptable-use-policy",
});

export default function AcceptableUsePolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="rule-double pb-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Acceptable use policy
        </h1>
        <p className="tag-cap mt-3">Fair-use terms for {SITE_NAME} hosting</p>
      </header>

      <div className="article-body mt-8">
        <p>
          Our goal at {SITE_NAME} is to give you everything you need to get
          going without worrying about hardware or servers. The limits below are
          fair and, for the large majority of customers, have no impact. They
          exist to stop the abuse and spam that would otherwise degrade the
          service for everyone. If you&rsquo;re ever unsure, reach out for
          clarification &mdash; knowingly breaching these terms may lead to
          account suspension.
        </p>

        <h2>&ldquo;Unlimited&rdquo;, &ldquo;Unmetered&rdquo; &amp; &ldquo;Lifetime&rdquo;</h2>
        <p>
          On some plans we offer &ldquo;unmetered&rdquo; or
          &ldquo;unlimited&rdquo; resources for normal website use. Because these
          are a common vector for abuse, the following are <strong>not</strong>{" "}
          permitted: mass file storage, mass file archiving or backup, mass
          mailing, torrenting or seeding, and use as a remote file host for other
          websites.
        </p>
        <p>
          &ldquo;Lifetime&rdquo; hosting is defined as for as long as the product
          is available for commercial resale, or a minimum of 5 years&rsquo;
          service. {SITE_NAME} aims to provide services for as long as possible
          and has no planned obsolescence. Lifetime packages are per named
          customer and are not transferable.
        </p>

        <h2>Email</h2>
        <p>All emails sent through our services must:</p>
        <ul>
          <li>Be spam-free</li>
          <li>Not be marketing or promotional in nature</li>
          <li>Have valid DNS records</li>
          <li>Not relate to leak forums or adult forums</li>
          <li>Not be used deceptively against third-party services</li>
          <li>Not be part of an email warm-up service</li>
        </ul>
        <p>
          We allow up to 300 transactional or personal emails per hour. Accounts
          exceeding this are throttled, and shared and lifetime packages are
          capped at 300 emails per day. In short: use email like you would your
          own personal account &mdash; keep it lawful and sensible and you
          won&rsquo;t have any issues. We do not allow newsletters or mailing
          lists.
        </p>

        <h2>Network usage</h2>
        <p>
          Don&rsquo;t provoke, send, or entertain any attacks or abuse of our
          network &mdash; doing so puts your account at risk of termination. If
          you plan to run a Tor node or an IRC server, you must consult us first
          so we can take appropriate measures; not all services support this. We
          use strong DDoS protection, but in the event of network downtime caused
          by an attack, {SITE_NAME} is not liable for damages or downtime outside
          of our control.
        </p>

        <h2>Resource usage limits</h2>
        <p>
          Shared hosting provides web space on our servers so you can publish
          websites. It allows &ldquo;unlimited&rdquo; space for normal,
          non-file-distribution web use. For sites that allow downloading of
          video, audio, or other files, we reserve the right to impose a
          bandwidth limit of 250&nbsp;GB per calendar month. In your use of
          shared hosting you may not:
        </p>
        <ul>
          <li>
            Use more than 10% of our platform&rsquo;s processing capacity, or
            more than 250% of your individual CPU allocation, whichever comes
            first.
          </li>
          <li>
            Run stand-alone, unattended server-side processes or daemons
            (including IRCd).
          </li>
          <li>Run any web spider or indexer.</li>
          <li>
            Run any BitTorrent application, tracker, or client. You may link to
            legal torrent files off-site, but not host them on our servers.
          </li>
          <li>Participate in file-sharing or peer-to-peer activities.</li>
          <li>Run game servers.</li>
          <li>
            Operate a proxy website or service, or act as a remote file host for
            other websites.
          </li>
          <li>
            Operate self-hosted file sync or &ldquo;cloud storage&rdquo; services
            (including OwnCloud, Pydio, and Sparkleshare).
          </li>
          <li>
            Give away web space under a domain (including resellers giving away
            free websites).
          </li>
        </ul>
        <p>
          You must not use the hosting as an off-site backup facility. All files
          must be web-visible unless they are needed to operate your website.
          MySQL databases are limited to 2&nbsp;GB; when one reaches that size we
          will notify you to confirm it is valid and not a rogue process.
          Bandwidth-intensive distribution of video, audio, or downloadable
          assets should be served via a suitable third-party storage provider or
          CDN.
        </p>

        <h2>Legal &amp; legitimate use</h2>
        <p>
          You may use our services only for lawful, legitimate purposes. You must
          follow local law and may not use the service in any way that is
          unlawful or fraudulent, that has any unlawful or fraudulent purpose or
          effect, or that harms or attempts to harm anyone &mdash; particularly
          minors &mdash; in any way.
        </p>

        <p>
          Questions about this policy? Use the{" "}
          <a href="/contact">contact page</a>. See also our{" "}
          <a href="/privacy-policy">privacy policy</a> and{" "}
          <a href="/terms-of-use">terms of use</a>.
        </p>
      </div>
    </div>
  );
}
