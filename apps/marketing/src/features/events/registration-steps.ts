import type { Event, EventQuestion } from '@iaa/shared';

export type StepKind = 'text' | 'email' | 'tel' | 'date' | 'long-text' | 'single-choice' | 'multi-choice';

export interface RegistrationStep {
  /** Where the answer lands: a core profile field, or a custom question id. */
  key: string;
  question: string;
  hint?: string;
  kind: StepKind;
  required: boolean;
  options?: string[];
  /** Core steps write to the registration body directly; custom ones to answers. */
  core: boolean;
  placeholder?: string;
}

/**
 * The questions every event asks. Only a name and an email are required — the
 * rest is audience research, and a visitor can skip straight past it.
 */
export const CORE_STEPS: readonly RegistrationStep[] = [
  {
    key: 'fullName',
    question: 'First, what should we call you?',
    kind: 'text',
    required: true,
    core: true,
    placeholder: 'Your full name',
  },
  {
    key: 'email',
    question: 'Where should we send your joining link?',
    hint: 'We only use this for this event and our updates. You can unsubscribe any time.',
    kind: 'email',
    required: true,
    core: true,
    placeholder: 'you@example.com',
  },
  {
    key: 'phone',
    question: "What's the best number to reach you on?",
    hint: 'Optional — helpful if we need to send a last-minute change.',
    kind: 'tel',
    required: false,
    core: true,
    placeholder: '+233 …',
  },
  {
    key: 'dateOfBirth',
    question: 'When were you born?',
    hint: 'Optional. It helps us understand who our programmes are reaching.',
    kind: 'date',
    required: false,
    core: true,
  },
  {
    key: 'occupation',
    question: 'What do you do right now?',
    hint: 'Optional — student, developer, founder, between roles, anything.',
    kind: 'text',
    required: false,
    core: true,
    placeholder: 'Your role or field',
  },
  {
    key: 'organisation',
    question: 'Where do you work or study?',
    hint: 'Optional.',
    kind: 'text',
    required: false,
    core: true,
    placeholder: 'Organisation or school',
  },
  {
    key: 'country',
    question: 'Which country are you joining from?',
    hint: 'Optional.',
    kind: 'text',
    required: false,
    core: true,
    placeholder: 'e.g. Ghana',
  },
];

const QUESTION_KIND: Record<EventQuestion['type'], StepKind> = {
  'short-text': 'text',
  'long-text': 'long-text',
  'single-choice': 'single-choice',
  'multi-choice': 'multi-choice',
  date: 'date',
};

/** Core audience questions first, then anything this event asks on its own. */
export const buildSteps = (event: Event): RegistrationStep[] => [
  ...CORE_STEPS,
  ...(event.questions ?? []).map((question) => ({
    key: question.id,
    question: question.label,
    hint: question.helpText,
    kind: QUESTION_KIND[question.type],
    required: question.required,
    options: question.options,
    core: false,
  })),
];
