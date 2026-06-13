import Anthropic from '@anthropic-ai/sdk';
import type { AiAssistAction, AiAssistInput } from '@iaa/shared';

import { ServiceUnavailableError } from '../../common/errors.js';

/** Per-action steering for the writing assistant. */
const ACTION_PROMPTS: Record<AiAssistAction, string> = {
  improve: 'Improve the clarity, flow, and grammar while preserving the original meaning and tone.',
  formalize: 'Rewrite it in a more formal, professional tone suitable for an organisation’s website.',
  shorten: 'Make it more concise without losing the key information.',
  expand: 'Expand it with more relevant detail and helpful context, keeping the same tone.',
  summarize: 'Summarise it concisely, capturing only the key points.',
  'fix-grammar':
    'Correct spelling, grammar, and punctuation only. Keep the wording, tone, and meaning unchanged.',
  simplify: 'Simplify the language so it is clear and easy to read for a general audience.',
};

const SYSTEM_PROMPT = [
  'You are a writing assistant embedded in the content management system for Impact Africa Alliance, a pan-African non-profit.',
  'Rewrite the user-provided text according to the requested transformation.',
  'Return ONLY the rewritten text — no preamble, no quotation marks, no explanations, and no markdown code fences.',
  'Preserve the original language. If the text contains markdown formatting, keep it intact.',
].join(' ');

/** Calls Claude to transform a single block of text. No DB or DI — constructed with the API key. */
export class AiAssistService {
  private readonly client: Anthropic | null;

  constructor(apiKey?: string) {
    this.client = apiKey ? new Anthropic({ apiKey }) : null;
  }

  get configured(): boolean {
    return this.client !== null;
  }

  async assist(input: AiAssistInput): Promise<string> {
    if (!this.client) {
      throw new ServiceUnavailableError(
        'The AI writing assistant is not configured. Set ANTHROPIC_API_KEY on the server.',
      );
    }

    const instruction = ACTION_PROMPTS[input.action];
    const extra = input.instructions ? `\n\nAdditional instructions: ${input.instructions}` : '';

    const message = await this.client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `${instruction}${extra}\n\nText:\n"""\n${input.text}\n"""`,
        },
      ],
    });

    return message.content
      .map((block) => (block.type === 'text' ? block.text : ''))
      .join('')
      .trim();
  }
}
