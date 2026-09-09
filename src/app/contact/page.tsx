import type { Metadata } from 'next';
import { AlertTriangle, Mail, MessageSquareWarning } from 'lucide-react';
import { Callout, Container, JsonLd } from '@/components/ui/primitives';
import { breadcrumbLd, buildMetadata, jsonLdGraph } from '@/lib/seo';
import { SITE } from '@/lib/site';

export const revalidate = 86400;

export const metadata: Metadata = buildMetadata({
  title: 'Contact',
  description: `Report an error in an article, suggest a story, or reach the ${SITE.name} team.`,
  path: '/contact',
});

export default function ContactPage() {
  return (
    <>
      <JsonLd
        data={jsonLdGraph(
          breadcrumbLd([
            { name: 'Home', path: '/' },
            { name: 'Contact', path: '/contact' },
          ]),
        )}
      />

      <Container className="py-14">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-4xl font-bold tracking-tight">Contact</h1>
          <p className="mt-5 text-lg text-muted-foreground">
            Corrections get priority. If something on this site is wrong, out of date, or missing
            the context that would change how you read it, that is the most useful thing you can
            tell us.
          </p>

          <div className="mt-10 space-y-4">
            <Row
              icon={<MessageSquareWarning className="h-5 w-5 text-brand" aria-hidden="true" />}
              title="Report an error in an article"
              body="Include the URL and which claim is wrong. If you have a source that contradicts it, send that too — it is the quickest way to get the page fixed."
              href="mailto:corrections@favo.news"
              label="corrections@favo.news"
            />
            <Row
              icon={<AlertTriangle className="h-5 w-5 text-brand" aria-hidden="true" />}
              title="Suggest a story"
              body="Something happening in tech, entertainment, sport, money, health, gaming, travel or education that is being covered badly or not at all."
              href="mailto:tips@favo.news"
              label="tips@favo.news"
            />
            <Row
              icon={<Mail className="h-5 w-5 text-brand" aria-hidden="true" />}
              title="Everything else"
              body="Advertising, syndication, or anything that does not fit above."
              href="mailto:hello@favo.news"
              label="hello@favo.news"
            />
          </div>

          <Callout tone="brand" title="Why there is no contact form" className="mt-10">
            A form needs spam handling and a mail transport behind it; an address does not.
            Email reaches a person either way, and it gives you a copy of what you sent.
          </Callout>
        </div>
      </Container>
    </>
  );
}

function Row({
  icon,
  title,
  body,
  href,
  label,
}: {
  icon: React.ReactNode;
  title: string;
  body: React.ReactNode;
  href: string;
  label: string;
}) {
  return (
    <div className="surface flex gap-4 p-5">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div>
        <h2 className="font-semibold">{title}</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
        <a href={href} className="mt-3 inline-block text-sm font-medium text-brand hover:underline">
          {label}
        </a>
      </div>
    </div>
  );
}
