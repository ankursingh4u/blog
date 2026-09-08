import type { FaqItem } from '@/lib/json';

/**
 * FAQ rendered as native <details>. It emits FAQPage JSON-LD from the page,
 * so the answers must be in the initial HTML — an accordion that mounts its
 * answers on click would leave the structured data unsupported by visible
 * content, which is a Google rich-result violation.
 */
export function FaqSection({ faq }: { faq: FaqItem[] }) {
  if (faq.length === 0) return null;

  return (
    <section aria-labelledby="faq-heading" className="mt-14">
      <h2 id="faq-heading" className="text-2xl font-bold tracking-tight">
        Frequently asked questions
      </h2>
      <div className="mt-6 divide-y divide-border border-y border-border">
        {faq.map((item) => (
          <details key={item.question} className="group py-4 [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex cursor-pointer items-center justify-between gap-4 text-base font-medium">
              {item.question}
              <span
                aria-hidden="true"
                className="shrink-0 text-xl leading-none text-muted-foreground transition-transform group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <p className="mt-3 text-pretty text-muted-foreground">{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
