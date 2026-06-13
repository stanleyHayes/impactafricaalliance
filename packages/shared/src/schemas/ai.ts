import { z } from 'zod';

/** Writing-assistant transformations offered on text fields. */
export const AI_ASSIST_ACTIONS = [
  'improve',
  'formalize',
  'shorten',
  'expand',
  'summarize',
  'fix-grammar',
  'simplify',
] as const;

export type AiAssistAction = (typeof AI_ASSIST_ACTIONS)[number];

export const aiAssistSchema = z.object({
  text: z.string().min(1, 'There is no text to rewrite').max(20000),
  action: z.enum(AI_ASSIST_ACTIONS),
  /** Optional free-form steer (e.g. "keep it under 2 sentences"). */
  instructions: z.string().max(2000).optional(),
});

export type AiAssistInput = z.infer<typeof aiAssistSchema>;

export interface AiAssistResponse {
  result: string;
}
