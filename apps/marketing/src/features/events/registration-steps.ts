import type { Event, EventQuestion } from '@iaa/shared';

export type StepKind =
  | 'text'
  | 'email'
  | 'tel'
  | 'date'
  | 'long-text'
  | 'single-choice'
  | 'multi-choice';

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
 * "Section 1 — About You" from the programme questionnaire: the audience
 * profile every session asks for. Only name and email are required; the rest
 * carries a Skip, because a free webinar should not gate entry on research.
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
    question: "What's your phone or WhatsApp number?",
    hint: 'Optional — helpful if we need to send a last-minute change.',
    kind: 'tel',
    required: false,
    core: true,
    placeholder: '+233 …',
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
  {
    key: 'city',
    question: 'And which city or region?',
    hint: 'Optional.',
    kind: 'text',
    required: false,
    core: true,
    placeholder: 'e.g. Accra',
  },
  {
    key: 'ageRange',
    question: 'Which age range are you in?',
    hint: 'Optional. It helps us understand who our programmes reach.',
    kind: 'single-choice',
    required: false,
    core: true,
    options: ['Under 18', '18–24', '25–29', '30–34', '35–44', '45+'],
  },
  {
    key: 'gender',
    question: 'How do you identify?',
    hint: 'Optional.',
    kind: 'single-choice',
    required: false,
    core: true,
    options: ['Female', 'Male', 'Prefer not to say', 'Other'],
  },
  {
    key: 'describesYou',
    question: 'What best describes you right now?',
    hint: 'Optional.',
    kind: 'single-choice',
    required: false,
    core: true,
    options: [
      'Student',
      'Recent graduate',
      'Job seeker',
      'Employed professional',
      'Entrepreneur / Business owner',
      'Freelancer',
      'Founder / Co-founder',
      'Young professional',
      'Researcher / Academic',
      'Career changer',
      'NGO / Development professional',
      'Other',
    ],
  },
  {
    key: 'educationLevel',
    question: "What's your highest level of education?",
    hint: 'Optional.',
    kind: 'single-choice',
    required: false,
    core: true,
    options: [
      'Senior High School',
      'Diploma',
      "Bachelor's Degree",
      "Master's Degree",
      'PhD',
      'Professional Certification',
      'Other',
    ],
  },
  {
    key: 'field',
    question: "What's your field of study, work or business?",
    hint: 'Optional.',
    kind: 'text',
    required: false,
    core: true,
    placeholder: 'e.g. Nursing, software, agribusiness',
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
