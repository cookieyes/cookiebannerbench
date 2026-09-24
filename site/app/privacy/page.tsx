import type { Metadata } from "next";
import { Fragment } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { GITHUB_URL, LEGAL, SITE_NAME, SITE_URL } from "@/lib/config";

export const metadata: Metadata = {
  title: "Privacy policy",
  description:
    "What is processed when you visit cookiebannerbench.com, the cookies and local storage the site uses, and how to exercise your rights.",
  alternates: { canonical: `${SITE_URL}/privacy/` },
};

/** A postal address printed a line at a time, as the policy sets it. */
function Lines({ lines }: { lines: readonly string[] }) {
  return (
    <>
      {lines.map((line, i) => (
        <Fragment key={line}>
          {i === 0 ? null : <br />}
          {line}
        </Fragment>
      ))}
    </>
  );
}

export default function Privacy() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="page doc">
        <div className="lead">
          <section className="opening region">
            <h1 className="t-display">Privacy policy</h1>
            <p className="lede t-body">
              {SITE_NAME} is a published benchmark, not a product. This policy explains the limited
              information processed when you visit cookiebannerbench.com and how we use cookies and
              similar technologies.
            </p>
            <p className="run-line t-body-sm">
              <span>Last updated</span>
              <span className="t-ident-sm">{LEGAL.lastUpdated}</span>
            </p>
          </section>
        </div>

        <section className="region prose" id="controller">
          <h2 className="t-title">Data controller</h2>
          <p className="t-body">
            {LEGAL.entity} is the data controller for {SITE_NAME} and cookiebannerbench.com. Our
            registered address is {LEGAL.address}. Our representative in the European Union is{" "}
            {LEGAL.euRepresentative}.
          </p>
          <p className="t-body">
            This policy covers this website only. It does not cover the CookieYes product or any
            other CookieYes website, each of which has its own policy. It also does not apply to
            data processed on a customer's behalf where CookieYes acts as a processor rather than a
            controller.
          </p>
        </section>

        <section className="region prose" id="data">
          <h2 className="t-title">Personal data we collect</h2>
          <p className="t-body">
            We do not ask you to provide personal data directly. The site has no account system,
            contact form, newsletter, comments or payment facility. We do not ask for your name,
            email address or payment details.
          </p>
          <p className="t-body">
            Our hosting provider records standard server log data when your browser requests a page.
            That log typically contains:
          </p>
          <ul className="t-body">
            <li>The IP address from which the request originated.</li>
            <li>The date and time of the request.</li>
            <li>The page or file requested and the response status.</li>
            <li>The browser user-agent string and, where sent, the referring page.</li>
          </ul>
          <p className="t-body">
            An IP address may be personal data under the UK GDPR and EU GDPR. We do not combine
            server-log information with other information to build a profile or attempt to identify
            you.
          </p>
        </section>

        <section className="region prose" id="legal-basis">
          <h2 className="t-title">Legal basis for processing</h2>
          <p className="t-body">
            We rely on our legitimate interests under Article 6(1)(f) of the UK GDPR and EU GDPR to
            process server logs and operate, secure and improve the site. These interests include
            keeping the site available, diagnosing faults and protecting it against abuse.
          </p>
          <p className="t-body">
            Where applicable law requires consent before we store or access optional cookies or
            similar technologies, we rely on that consent. You may withdraw it at any time through
            the cookie controls made available on the site.
          </p>
        </section>

        <section className="region prose" id="cookies">
          <h2 className="t-title">Cookies and local storage</h2>
          <p className="t-body">
            We use cookies and similar browser technologies. Cookies are small text files placed on
            your device when you visit a website. Some last only for the browser session; others
            remain until they expire or you delete them. The technologies used on this site may
            include:
          </p>
          <ul className="t-body">
            <li>
              <b>Necessary storage:</b> used to provide the site, protect it and remember your
              privacy choices.
            </li>
            <li>
              <b>Preference storage:</b> used to remember settings you choose, such as the site's
              appearance.
            </li>
            <li>
              <b>Measurement storage:</b> used, where enabled and with consent when required, to
              understand aggregate use and improve the benchmark.
            </li>
          </ul>
          <p className="t-body">
            The current site also stores the localStorage value <code>cookiebannerbench-theme</code>
            , which remembers whether you chose the light or dark theme. The value stays in your
            browser, contains no identifier and is removed when you clear site data or return the
            theme to "system".
          </p>
          <p className="t-body">
            You can use the site's cookie controls, where displayed, to accept or reject optional
            categories and change your choices later. You can change or withdraw your consent at any
            time by selecting the floating “Revisit consent” button, shown on every page. This
            reopens the preference panel, where you can enable or disable optional cookie categories
            and save your updated choices.
          </p>
          <p className="t-body">
            You can also block or delete cookies in your browser settings, although doing so may
            prevent preferences or parts of the site from working as intended. Necessary
            technologies cannot always be disabled through our controls because they are required to
            provide the site.
          </p>
        </section>

        <section className="region prose" id="disclosure">
          <h2 className="t-title">Disclosure of personal data</h2>
          <p className="t-body">
            We do not sell or rent personal data, and we do not use it for targeted advertising.{" "}
            {LEGAL.host}, our hosting provider, processes request and server-log data on our
            instructions to serve and protect the site. Where we enable measurement, we do so only
            with your consent. Where you consent to measurement (that is, where you consent to the
            analytics cookie category), the relevant service provider may process cookie identifiers
            and usage information on our behalf.
          </p>
          <p className="t-body">
            We may disclose data where required by law or where necessary to establish, exercise or
            defend legal claims.
          </p>
        </section>

        <section className="region prose" id="transfers">
          <h2 className="t-title">International transfers</h2>
          <p className="t-body">
            The site is served from a global content delivery network, so a request may be handled
            by a server outside the United Kingdom or European Economic Area. Where data is
            transferred outside the UK or EEA, we use an applicable safeguard, such as an adequacy
            decision, the European Commission's standard contractual clauses or the UK International
            Data Transfer Addendum.
          </p>
        </section>

        <section className="region prose" id="retention">
          <h2 className="t-title">Data retention</h2>
          <p className="t-body">
            We do not maintain an account or customer database for this site. We keep personal data
            only for as long as needed for the purposes described in this policy, including
            security, troubleshooting and legal compliance. Cookies and similar technologies remain
            for the duration stated in the cookie controls or until you delete them. Server-log
            retention is determined by our hosting configuration and may be extended where needed to
            investigate a security incident or comply with law.
          </p>
        </section>

        <section className="region prose" id="security">
          <h2 className="t-title">Data security</h2>
          <p className="t-body">
            The site is served over HTTPS. We use appropriate technical and organisational measures
            designed to protect the limited information processed through the site. No method of
            transmission or storage is completely secure. The source of every page and the
            measurement data behind every benchmark number are public in the{" "}
            <a href={GITHUB_URL}>project repository</a>.
          </p>
        </section>

        <section className="region prose" id="links">
          <h2 className="t-title">Links to other websites</h2>
          <p className="t-body">
            This site links to the websites of the consent providers it measures, the project source
            repository and npm. Those sites set their own cookies and have their own privacy
            policies, over which we have no control. This policy applies only to {SITE_NAME}.
          </p>
        </section>

        <section className="region prose" id="rights">
          <h2 className="t-title">Your legal rights</h2>
          <p className="t-body">
            Depending on the law that applies to you, you may have the following rights in relation
            to personal data we hold about you:
          </p>
          <ul className="t-body">
            <li>
              <b>Access:</b> request a copy of your personal data and check that it is processed
              lawfully.
            </li>
            <li>
              <b>Rectification or deletion:</b> ask us to correct inaccurate data or delete data
              where the law permits.
            </li>
            <li>
              <b>Restriction:</b> ask us to limit how your personal data is processed.
            </li>
            <li>
              <b>Objection:</b> object to processing based on our legitimate interests.
            </li>
            <li>
              <b>Portability:</b> request eligible data in a structured, commonly used and
              machine-readable format.
            </li>
          </ul>
          <p className="t-body">
            Because this site has no accounts, we may be unable to link technical records to you
            without additional information. If you can identify the relevant requests (for example,
            by providing an IP address and approximate time), we will consider and respond to your
            request in accordance with applicable law.
          </p>
        </section>

        <section className="region prose" id="complaints">
          <h2 className="t-title">Complaints</h2>
          <p className="t-body">
            Please contact us first if you have a privacy concern. You also have the right to
            complain to a supervisory authority.
          </p>
          <p className="t-body">
            For UK individuals the data protection authority is: <br />
            <Lines lines={LEGAL.supervisoryAuthorityAddress} />
          </p>
          <p className="t-body">
            If you are located in the EU and have questions or concerns regarding your personal
            data, you may contact our appointed GDPR representative:
          </p>
          <address className="t-body rep">
            <b>EU Representative</b>
            <br />
            <Lines lines={LEGAL.euRepresentativeAddress} />
          </address>
          <p className="t-body">
            Email:{" "}
            <a href={`mailto:${LEGAL.euRepresentativeEmail}`}>{LEGAL.euRepresentativeEmail}</a>
          </p>
          <p className="t-body">
            To submit a Data Subject Access Request (DSAR), data deletion request, or any other
            GDPR-related inquiry, please use our secure portal at:{" "}
            <a href={LEGAL.euRepresentativePortal} rel="noopener">
              {LEGAL.euRepresentativePortal}
            </a>
          </p>
          <p className="t-body">
            This link allows you to verify our appointed representative and submit GDPR requests
            directly. Requests submitted through this portal are logged and tracked to ensure timely
            response and compliance.
          </p>
          <p className="t-body">
            When contacting our Representative please ensure you include our company name in any
            correspondence.
          </p>
          <p className="t-body">
            Please note that you would have to provide us with the details as mentioned in the “Your
            legal rights” section of this document for us to help you with exercising your rights.
          </p>
        </section>

        <section className="region prose" id="children">
          <h2 className="t-title">Children</h2>
          <p className="t-body">
            This site is intended for a professional audience and is not directed at children. We do
            not knowingly collect personal data relating to children.
          </p>
        </section>

        <section className="region prose" id="changes">
          <h2 className="t-title">Changes to this policy</h2>
          <p className="t-body">
            Changes to this policy will be published on this page with a revised date. Because the
            site is open source, the history of the policy can also be reviewed in the{" "}
            <a href={GITHUB_URL}>project repository</a>.
          </p>
        </section>

        <section className="region prose" id="contact">
          <h2 className="t-title">Contact</h2>
          <p className="t-body">
            For questions, comments or requests about this policy or our privacy practices, contact:
          </p>
          <ul className="t-body">
            <li>
              <b>Email:</b> <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>
            </li>
            <li>
              <b>Post:</b> {LEGAL.entity}, {LEGAL.address}.
            </li>
          </ul>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
