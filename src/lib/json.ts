import { z } from 'zod';

/**
 * JSON columns are stored as TEXT so the schema works identically on SQLite and
 * Postgres. Everything that reads one goes through here: a malformed or
 * hand-edited column degrades to the fallback instead of throwing inside a
 * server component and blanking the page.
 */
// Inference is pinned to the schema's *output* type. Schemas here use
// `.default()`, so input and output differ, and inferring from the parameter
// would hand back the optional input shape.
export function parseJson<S extends z.ZodTypeAny>(
  raw: string | null | undefined,
  schema: S,
  fallback: z.output<S>,
): z.output<S> {
  if (!raw) return fallback;
  try {
    const result = schema.safeParse(JSON.parse(raw));
    return result.success ? result.data : fallback;
  } catch {
    return fallback;
  }
}

export function toJson(value: unknown): string {
  return JSON.stringify(value ?? null);
}

export const StringArray = z.array(z.string());

export const FaqItem = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
});
export type FaqItem = z.infer<typeof FaqItem>;
export const FaqArray = z.array(FaqItem);

export const SourceRef = z.object({
  url: z.string().url(),
  title: z.string().default(''),
});
export type SourceRef = z.infer<typeof SourceRef>;
export const SourceRefArray = z.array(SourceRef);

export const Screenshot = z.object({
  url: z.string().min(1),
  alt: z.string().default(''),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});
export type Screenshot = z.infer<typeof Screenshot>;
export const ScreenshotArray = z.array(Screenshot);

/**
 * Attribution for an openly-licensed cover photograph.
 *
 * Lives here rather than beside the Openverse client so the article page can
 * read it without pulling in the search and storage code. Every field defaults
 * to empty: a generated card has no credit, and the renderer treats an empty
 * creator and licence as "nothing to display".
 */
export const ImageCreditSchema = z.object({
  creator: z.string().default(''),
  creatorUrl: z.string().default(''),
  license: z.string().default(''),
  licenseUrl: z.string().default(''),
  sourceUrl: z.string().default(''),
  sourceName: z.string().default(''),
  title: z.string().default(''),
});
export type ImageCreditData = z.infer<typeof ImageCreditSchema>;

export const EMPTY_CREDIT: ImageCreditData = {
  creator: '',
  creatorUrl: '',
  license: '',
  licenseUrl: '',
  sourceUrl: '',
  sourceName: '',
  title: '',
};
