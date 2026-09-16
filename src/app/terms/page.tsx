import type { Metadata } from 'next';
import Link from 'next/link';
import { Callout, Container, JsonLd } from '@/components/ui/primitives';
import { breadcrumbLd, buildMetadata, jsonLdGraph } from '@/lib/seo';
import { SITE } from '@/lib/site';

export const revalidate = 86400;

const LAST_UPDATED = '15 September 2026';

export const metadata: Metadata = buildMetadata({
  title: 'Terms and content rights',
  description:
    'An open publication: open-source software, open submissions, and articles that stay the property of whoever wrote them. What that means in practice.',
  path: '/terms',
});

export default function TermsPage() {
  return (
    <>
      <JsonLd
        data={jsonLdGraph(
          breadcrumbLd([
            { name: 'Home', path: '/' },
            { name: 'Terms and content rights', path: '/terms' },
          ]),
        )}
      />

      <Container className="py-14">
        <div className="mx-auto max-w-prose">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-brand">Legal</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight">Terms and content rights</h1>
          <p className="mt-5 text-lg text-muted-foreground">
            {SITE.name} is run as an open publication. The software is open source, the doors are
            open to anyone who wants to write, the writer keeps their work, and the material
            articles are built from is openly published and linked so you can go and check it. This
            page sets out what each of those actually commits us to.
          </p>
          <p className="mt-3 text-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>

          <Callout tone="brand" title="In one paragraph" className="mt-10">
            Anyone may submit an article. If we publish it, you keep the copyright — we only get
            permission to run it, and you can ask us to take it down. Our articles are drawn from
            publicly available sources, which are always cited. Names, logos and quoted material
            belong to whoever owns them. Nothing here is professional advice.
          </Callout>

          <div className="prose prose-lg mt-12 max-w-none dark:prose-invert">
            <h2>Open source</h2>
            <p>
              The software that runs this site — the publishing system, the templates, the pipeline
              that finds and researches stories — is open source. You are welcome to read it, learn
              from it, run your own copy, and take it apart to see exactly how a page here was put
              together. That is deliberate: a site that tells you how its articles are checked
              should let you verify the claim rather than ask you to trust it.
            </p>
            <p>
              Open source covers the <em>code</em>. It does not transfer the <em>articles</em> — see
              &ldquo;Who owns what you read&rdquo; below, because those two are commonly and
              wrongly treated as one thing.
            </p>

            <h2>Anyone can publish here</h2>
            <p>
              There is no application, no pitch letter and no account to create. Send an article
              through <Link href="/write">/write</Link> and an editor reads it. If we run it, it
              goes out under your name with your own author page, exactly like anything else on the
              site.
            </p>
            <p>Open does not mean unedited. What we ask of a submission:</p>
            <ul>
              <li>
                <strong>It has to be yours.</strong> Do not send us someone else&rsquo;s work,
                machine-rewritten work you have no rights to, or a press release with the letterhead
                removed.
              </li>
              <li>
                <strong>Claims have to be checkable.</strong> Link to where a figure, date, price or
                quote came from. Anything we cannot trace comes out.
              </li>
              <li>
                <strong>Nothing unlawful, defamatory or hateful</strong>, and nothing that exists to
                harass a named person.
              </li>
              <li>
                <strong>An editor decides.</strong> Nothing publishes automatically, we may edit for
                length, structure and clarity, and we can decline anything without giving a reason.
              </li>
            </ul>
            <p>
              The standards a published article is held to are set out in the{' '}
              <Link href="/editorial-policy">editorial policy</Link>.
            </p>

            <h2>Who owns what you read</h2>
            <p>
              <strong>The writer owns their article.</strong> Copyright in a contributed piece stays
              with the person who wrote it — we do not ask for it and we do not take it. By sending
              us an article you give {SITE.name} permission to publish it, keep it online, edit it
              for clarity, and distribute it in the site&rsquo;s feeds and search listings. That
              permission is non-exclusive: the piece is still yours to republish wherever else you
              like.
            </p>
            <p>
              It is also revocable. Email us and we will remove the article, or strip your byline
              and leave it, whichever you ask for.
            </p>
            <p>
              Photographs, illustrations and other images belong to whoever made them and are used
              with permission, under an open licence, or under the licence of the source they came
              from. If you believe an image here is yours and should not be, tell us — see
              &ldquo;Corrections and takedowns&rdquo;.
            </p>

            <h2>Where the material comes from</h2>
            <p>
              Articles are researched from openly available, publicly published sources: official
              documentation and announcements, public data, open feeds from established outlets, and
              other freely readable reporting. We do not get round paywalls and we do not republish
              another publication&rsquo;s article as our own.
            </p>
            <p>
              Where we quote or refer to someone else&rsquo;s reporting, it is attributed, kept
              short, and linked — every source an article was drawn from is listed at the bottom of
              it. The words remain the property of whoever wrote them; the quotation is use for
              reporting and commentary, not a transfer of anything.
            </p>
            <p>
              Product names, company names, logos and trademarks belong to their respective owners.
              {' '}
              {SITE.name} is independent and is not affiliated with, endorsed by or sponsored by
              anyone it writes about.
            </p>

            <h2>Reusing what is on this site</h2>
            <p>
              Quote us, link to us, and summarise us freely — attribution and a link back is all we
              ask. What we cannot hand over is a blanket right to republish a contributor&rsquo;s
              article in full, because it is not ours to give: that permission has to come from the
              writer. Ask us and we will put you in touch.
            </p>

            <h2>Corrections and takedowns</h2>
            <p>
              If something here is wrong, is your work, infringes your rights or names you unfairly,
              write to <a href={`mailto:${SITE.email}`}>{SITE.email}</a> with the page address and
              what the problem is. Complaints of that kind are handled quickly and without argument
              — we would rather pull a page and look into it than defend one. Factual corrections go
              through the <Link href="/contact">contact page</Link> and are made in the article
              itself.
            </p>

            <h2>No warranty, and not advice</h2>
            <p>
              Articles are published in good faith and as-is. News moves, prices change and fixes
              that worked last month stop working; we cannot promise a page is complete or current.
              Nothing here is financial, medical, legal or professional advice — decisions of that
              kind need someone qualified who knows your circumstances. Back up your data before
              applying any technical fix. To the extent the law allows, we are not liable for what
              follows from acting on something you read here.
            </p>

            <h2>Advertising</h2>
            <p>
              The site is funded by display slots we sell and serve ourselves. There are no
              affiliate links, no buy buttons, no sponsored articles and no paid inclusion. No
              advertiser sees an article before it publishes or has any say in what is covered.
            </p>

            <h2>Privacy</h2>
            <p>
              What we store and what we do not is set out in full on the{' '}
              <Link href="/privacy">privacy policy</Link>. In short: no reader accounts, nothing
              sold on, and you can have anything of yours deleted by asking.
            </p>

            <h2>Changes</h2>
            <p>
              These terms can change as the site does. Material changes move the date at the top of
              this page.
            </p>
          </div>
        </div>
      </Container>
    </>
  );
}
