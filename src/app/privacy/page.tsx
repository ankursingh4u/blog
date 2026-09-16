import type { Metadata } from 'next';
import Link from 'next/link';
import { Callout, Container, JsonLd } from '@/components/ui/primitives';
import { breadcrumbLd, buildMetadata, jsonLdGraph } from '@/lib/seo';
import { SITE } from '@/lib/site';

export const revalidate = 86400;

/**
 * Written against what the code actually does rather than from a template.
 * If you change what is stored — a new form field, an analytics tag, a
 * third-party embed — this page has to change with it, and the "Last updated"
 * line below has to move.
 */
const LAST_UPDATED = '15 September 2026';

export const metadata: Metadata = buildMetadata({
  title: 'Privacy policy',
  description:
    'What this site stores, what it does not, and how to have anything you sent us removed. No accounts, no profiles, no selling anything on.',
  path: '/privacy',
});

export default function PrivacyPage() {
  return (
    <>
      <JsonLd
        data={jsonLdGraph(
          breadcrumbLd([
            { name: 'Home', path: '/' },
            { name: 'Privacy policy', path: '/privacy' },
          ]),
        )}
      />

      <Container className="py-14">
        <div className="mx-auto max-w-prose">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-brand">Legal</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight">Privacy policy</h1>
          <p className="mt-5 text-lg text-muted-foreground">
            {SITE.name} is an open publication: the software behind it is open source, anyone can
            submit an article, and everything published here is credited to the person who wrote it.
            Running it that way means we need very little from you, so this page is mostly a list of
            things we do not do.
          </p>
          <p className="mt-3 text-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>

          <Callout tone="brand" title="The short version" className="mt-10">
            <ul className="list-disc space-y-1.5 pl-5">
              <li>There are no reader accounts and no logins. You can read the whole site anonymously.</li>
              <li>We only hold personal data you typed into a form and sent us yourself.</li>
              <li>Your saved articles and your light/dark choice never leave your own browser.</li>
              <li>Nothing is sold, rented or handed to a data broker. Ever.</li>
              <li>
                Ask us to delete anything of yours and we will —{' '}
                <a href={`mailto:${SITE.email}`} className="underline hover:text-foreground">
                  {SITE.email}
                </a>
                .
              </li>
            </ul>
          </Callout>

          <div className="prose prose-lg mt-12 max-w-none dark:prose-invert">
            <h2>What we collect, and only then</h2>
            <p>
              Reading {SITE.name} requires nothing from you. No sign-up, no email wall, no
              &ldquo;create an account to continue&rdquo;. The only time we hold anything personal
              is when you choose to send it.
            </p>

            <h3>If you submit an article</h3>
            <p>
              The form at <Link href="/write">/write</Link> asks for your name, your email address,
              a short biography and the article itself, plus any images you attach. We store those
              so an editor can read the submission, reply to you, and — if it runs — publish it
              under your byline.
            </p>
            <ul>
              <li>
                <strong>Your name and biography are published</strong> with the article if we run
                it. That is the point of a byline; send us the name you are happy to appear under.
              </li>
              <li>
                <strong>Your email address is never published.</strong> It is used to reply to you
                about your submission and to stop the same address flooding the queue. It is not
                added to a mailing list, because there is no mailing list.
              </li>
              <li>
                Images you attach are stored alongside the article and published with it if it runs.
                Do not send us photographs of other people without their agreement.
              </li>
              <li>
                Submissions we do not publish stay in the queue until we clear it. Ask and we will
                delete yours on the spot.
              </li>
            </ul>

            <h3>If you email us</h3>
            <p>
              Correspondence sent to the addresses on the{' '}
              <Link href="/contact">contact page</Link> sits in an ordinary mailbox and is kept for
              as long as it is useful to keep — a correction thread, for instance, is worth having
              when the same question comes back a year later.
            </p>

            <h2>What stays on your own device</h2>
            <p>
              Two things are stored in your browser and are never transmitted to us, because there
              is no account for them to be attached to:
            </p>
            <ul>
              <li>
                <strong>Saved articles.</strong> The list behind <Link href="/saved">/saved</Link>{' '}
                is a set of article addresses kept in your browser&rsquo;s local storage. It is
                per-device, and clearing your browser data clears it.
              </li>
              <li>
                <strong>Light or dark mode.</strong> One value, same place, so the page does not
                flash the wrong colour on your next visit.
              </li>
            </ul>
            <p>
              Neither is a tracking cookie and neither reaches our server. The only cookie this site
              sets is the sign-in session for the small number of people who edit it, and it is set
              only after they sign in.
            </p>

            <h2>Analytics</h2>
            <p>
              Where Google Analytics is enabled, it records aggregate visits — which pages are read,
              roughly where from, which site referred you — and sets its own cookies to do it. We
              use it to see which articles were worth writing. We do not attempt to identify
              individual readers, and we have not enabled any advertising or cross-site
              identification features in it.
            </p>
            <p>
              Your browser&rsquo;s tracking protection, an extension that blocks it, or the{' '}
              <a
                href="https://tools.google.com/dlpage/gaoptout"
                rel="nofollow noopener"
                target="_blank"
              >
                Google Analytics opt-out add-on
              </a>{' '}
              will all stop it. Nothing on this site is withheld from readers who block it.
            </p>

            <h2>Advertising</h2>
            <p>
              The site is paid for by display slots we sell and serve ourselves. There are no
              affiliate links and nothing to buy here. Where a slot is filled by a third-party ad
              network, that network can set its own cookies and see your IP address and the page you
              were on — that is the network&rsquo;s processing under its own policy, not ours, and
              we do not pass it anything about you. We do not build advertising profiles of readers.
            </p>

            <h2>Server logs</h2>
            <p>
              Like any web server, ours records the request: IP address, time, page, user agent.
              These are ordinary operational logs, used for debugging and for spotting abuse, kept
              briefly and not combined with anything else to identify you.
            </p>

            <h2>Links and sources we send you to</h2>
            <p>
              Articles here are built from openly published material and every article links to what
              it was drawn from. Once you follow one of those links you are on someone else&rsquo;s
              site under someone else&rsquo;s privacy policy. We cannot speak for them.
            </p>

            <h2>Children</h2>
            <p>
              This is a general-audience news site and is not directed at children. We do not
              knowingly collect anything from a child under 13. If you believe we have, tell us and
              it will be deleted.
            </p>

            <h2>Your rights</h2>
            <p>
              You can ask us what we hold about you, ask for it to be corrected, ask for a copy, or
              ask for it to be deleted. One email to{' '}
              <a href={`mailto:${SITE.email}`}>{SITE.email}</a> is enough — you do not need to cite
              a regulation at us, and we do not charge for it. If you contributed an article and
              later want your name off it, say so; we will either remove the byline or take the page
              down, whichever you prefer. See the{' '}
              <Link href="/terms">terms and content rights</Link> page for how ownership of
              contributed work is handled.
            </p>

            <h2>Changes</h2>
            <p>
              If what we store changes, this page changes with it and the date at the top moves. We
              will not quietly widen it.
            </p>
          </div>
        </div>
      </Container>
    </>
  );
}
