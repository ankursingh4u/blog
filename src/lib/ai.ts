import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import type { z } from 'zod';

/**
 * OpenAI client for the generation pipeline.
 *
 * Every structured call goes through `generateJson`, which uses the API's
 * strict structured-output support rather than asking for JSON in the prompt and
 * stripping code fences afterwards. The schema is enforced server-side, so a
 * malformed response is not something the pipeline has to defend against.
 *
 * This is the single seam between the site and the model provider — nothing
 * outside this file imports an SDK. Swapping providers again means rewriting
 * this file and the two environment variables, and nothing else.
 *
 * Notes on the request shape, all verified against the live API rather than
 * assumed, because the GPT-5 family rejects several parameters that older
 * models accepted:
 *
 *   - `max_completion_tokens`, never `max_tokens` — the legacy name is refused
 *     outright ("not supported with this model").
 *   - No `temperature`. Only the default of 1 is accepted; sending any other
 *     value is a 400, so the field is omitted entirely and output is steered
 *     through prompting instead.
 *   - Strict structured outputs require *every* property to appear in
 *     `required`. The pipeline's schemas have no optional fields, so they pass
 *     as written; adding one later would need `.nullable()` rather than
 *     `.optional()`. Length and range constraints (`min`/`max` on strings,
 *     numbers and arrays) are accepted and enforced.
 */

export const DEFAULT_MODEL = 'gpt-5.5';

export class MissingApiKeyError extends Error {
  constructor() {
    super(
      'OPENAI_API_KEY is not set. Add it to .env before running the pipeline. ' +
        'See .env.example.',
    );
    this.name = 'MissingApiKeyError';
  }
}

export class GenerationError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'GenerationError';
  }
}

let cached: OpenAI | null = null;

export function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new MissingApiKeyError();
  if (!cached) {
    cached = new OpenAI({
      apiKey,
      // The SDK default is 2. A bulk backfill makes hundreds of calls back to
      // back, and a blip on the *second* call of a post throws away a draft
      // that has already been generated and paid for — the post lands in review
      // with a zero score and has to be regenerated from scratch. Retrying
      // costs a few seconds; not retrying costs the whole article.
      maxRetries: 5,
      // Reasoning models can think for a while before the first byte; the
      // default 10 minutes is generous but a hung socket should not stall a
      // multi-hour run indefinitely.
      timeout: 5 * 60 * 1000,
    });
  }
  return cached;
}

export function getModel(): string {
  return process.env.OPENAI_MODEL?.trim() || DEFAULT_MODEL;
}

export function hasApiKey(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

/**
 * The pipeline's effort vocabulary, kept as-is so callers did not have to change
 * when the provider did. OpenAI exposes three reasoning levels, so the two tiers
 * above `high` collapse onto it rather than being rejected.
 */
type Effort = 'low' | 'medium' | 'high' | 'xhigh' | 'max';

function reasoningEffort(effort: Effort): 'low' | 'medium' | 'high' {
  return effort === 'xhigh' || effort === 'max' ? 'high' : effort;
}

interface GenerateOptions<S extends z.ZodTypeAny> {
  system: string;
  prompt: string;
  schema: S;
  /**
   * Human-readable name for the shape being requested. Sent as the schema name
   * so the model knows what it is filling in, and it makes generation logs
   * readable. The API only accepts `[A-Za-z0-9_-]`, so it is slugified.
   */
  schemaName: string;
  maxTokens?: number;
  effort?: Effort;
}

export interface GenerateResult<T> {
  data: T;
  usage: { inputTokens: number; outputTokens: number };
}

/**
 * Running token tally across every call this process has made.
 *
 * Kept here rather than threaded through `generateDraft` and `runQualityGate`
 * return types: both discard the usage they receive, and the pipeline wants the
 * total for a post rather than per call. Reset it before a unit of work and read
 * it after. Not concurrency-safe, which is fine — the pipeline generates one
 * post at a time.
 */
export interface UsageTally {
  calls: number;
  inputTokens: number;
  outputTokens: number;
}

let tally: UsageTally = { calls: 0, inputTokens: 0, outputTokens: 0 };

export function resetUsage(): void {
  tally = { calls: 0, inputTokens: 0, outputTokens: 0 };
}

export function readUsage(): UsageTally {
  return { ...tally };
}

function record(inputTokens: number, outputTokens: number): void {
  tally = {
    calls: tally.calls + 1,
    inputTokens: tally.inputTokens + inputTokens,
    outputTokens: tally.outputTokens + outputTokens,
  };
}

/**
 * One structured generation call.
 *
 * `max_completion_tokens` covers reasoning *and* the response, so it is sized
 * well above the length of an article — a truncated piece surfaces as a
 * `length` finish reason and is thrown rather than silently half-saved.
 */
export async function generateJson<S extends z.ZodTypeAny>({
  system,
  prompt,
  schema,
  schemaName,
  maxTokens = 16000,
  effort = 'high',
}: GenerateOptions<S>): Promise<GenerateResult<z.infer<S>>> {
  const client = getClient();
  const name = schemaName.replace(/[^A-Za-z0-9_-]+/g, '_').slice(0, 64);

  let response;
  try {
    response = await client.chat.completions.parse({
      model: getModel(),
      max_completion_tokens: maxTokens,
      reasoning_effort: reasoningEffort(effort),
      response_format: zodResponseFormat(schema, name),
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: `${prompt}\n\nReturn a ${schemaName}.` },
      ],
    });
  } catch (error) {
    if (error instanceof OpenAI.RateLimitError) {
      // A 429 is not always throttling. An exhausted balance returns the same
      // status with "You have no credits remaining" in the body, and reporting
      // that as "retry later" sends you off waiting for a limit that will never
      // reset. Pass the API's own wording through.
      throw new GenerationError(`OpenAI refused the request (429): ${error.message}`, error);
    }
    if (error instanceof OpenAI.AuthenticationError) {
      throw new GenerationError('OPENAI_API_KEY was rejected.', error);
    }
    if (error instanceof OpenAI.APIError) {
      throw new GenerationError(`OpenAI API error ${error.status}: ${error.message}`, error);
    }
    // Include the cause: a bare "request failed" left a zero-scored post in the
    // review queue with nothing to diagnose it by.
    const detail = error instanceof Error ? error.message : String(error);
    throw new GenerationError(`OpenAI request failed: ${detail}`, error);
  }

  const choice = response.choices[0];
  if (!choice) throw new GenerationError('The model returned no choices.');

  // A refusal is a first-class field on the message rather than a stop reason,
  // and it arrives instead of the parsed object — check it before the payload.
  if (choice.message.refusal) {
    throw new GenerationError(`The model declined this request: ${choice.message.refusal}`);
  }
  if (choice.finish_reason === 'length') {
    throw new GenerationError(
      `Output hit the ${maxTokens}-token limit and is incomplete. Raise maxTokens or narrow the prompt.`,
    );
  }
  if (!choice.message.parsed) {
    throw new GenerationError('The model returned no parseable output for the requested schema.');
  }

  const inputTokens = response.usage?.prompt_tokens ?? 0;
  const outputTokens = response.usage?.completion_tokens ?? 0;
  record(inputTokens, outputTokens);

  return {
    data: choice.message.parsed as z.infer<S>,
    usage: { inputTokens, outputTokens },
  };
}

/** Plain-text call, used by the per-section regenerate action in the editor. */
export async function generateText({
  system,
  prompt,
  maxTokens = 8000,
  effort = 'medium',
}: {
  system: string;
  prompt: string;
  maxTokens?: number;
  effort?: 'low' | 'medium' | 'high';
}): Promise<string> {
  const client = getClient();

  let response;
  try {
    response = await client.chat.completions.create({
      model: getModel(),
      max_completion_tokens: maxTokens,
      reasoning_effort: reasoningEffort(effort),
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
    });
  } catch (error) {
    if (error instanceof OpenAI.APIError) {
      throw new GenerationError(`OpenAI API error ${error.status}: ${error.message}`, error);
    }
    // Include the cause: a bare "request failed" left a zero-scored post in the
    // review queue with nothing to diagnose it by.
    const detail = error instanceof Error ? error.message : String(error);
    throw new GenerationError(`OpenAI request failed: ${detail}`, error);
  }

  const choice = response.choices[0];
  if (!choice) throw new GenerationError('The model returned no choices.');
  if (choice.message.refusal) {
    throw new GenerationError('The model declined this request.');
  }

  record(response.usage?.prompt_tokens ?? 0, response.usage?.completion_tokens ?? 0);

  return (choice.message.content ?? '').trim();
}
