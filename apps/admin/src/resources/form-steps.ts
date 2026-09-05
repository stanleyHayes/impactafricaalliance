import type { FieldConfig, ResourceConfig } from './types';

interface StepDefinition {
  label: string;
  fields: readonly string[];
}

export interface ResourceFormStep {
  label: string;
  fields: FieldConfig[];
}

const STEP_DEFINITIONS: Record<string, readonly StepDefinition[]> = {
  articles: [
    { label: 'Details', fields: ['title', 'slug', 'tags'] },
    { label: 'Story', fields: ['excerpt', 'body'] },
    { label: 'Publishing', fields: ['coverImage', 'status', 'autoPostToSocial'] },
  ],
  stories: [
    { label: 'Person', fields: ['name', 'slug', 'country', 'program'] },
    { label: 'Story', fields: ['quote', 'narrative', 'photo'] },
    { label: 'Publishing', fields: ['status', 'featured', 'order'] },
  ],
  team: [
    { label: 'Profile', fields: ['name', 'role', 'tier', 'bio', 'photo'] },
    {
      label: 'Profile links',
      fields: ['linkedInUrl', 'xUrl', 'instagramUrl', 'facebookUrl', 'tiktokUrl'],
    },
    { label: 'Visibility', fields: ['order', 'isActive'] },
  ],
  offices: [
    { label: 'Address', fields: ['label', 'addressLine1', 'addressLine2', 'city', 'country'] },
    { label: 'Contact', fields: ['region', 'postalCode', 'phone', 'email', 'mapUrl'] },
    { label: 'Visibility', fields: ['isPrimary', 'order', 'isActive'] },
  ],
  reports: [
    { label: 'Report', fields: ['title', 'description', 'year', 'file'] },
    { label: 'Publishing', fields: ['status', 'order'] },
  ],
  jobs: [
    { label: 'Role', fields: ['title', 'slug', 'location', 'type'] },
    { label: 'Application', fields: ['description', 'applyUrl', 'deadline'] },
    { label: 'Publishing', fields: ['status'] },
  ],
  gallery: [
    { label: 'Photo', fields: ['image', 'title', 'programme', 'location', 'caption'] },
    { label: 'Publishing', fields: ['capturedOn', 'status', 'featured', 'order'] },
  ],
  stats: [
    { label: 'Figure', fields: ['key', 'label', 'value', 'suffix'] },
    { label: 'Visibility', fields: ['order', 'isActive'] },
  ],
  'page-settings': [
    { label: 'Search', fields: ['pageKey', 'seoTitle', 'seoDescription'] },
    { label: 'Hero', fields: ['heroEyebrow', 'heroTitle', 'heroSubtitle', 'heroImage'] },
    { label: 'Page content', fields: ['introEyebrow', 'introTitle', 'introBody', 'bodyContent'] },
    { label: 'Call to action', fields: ['ctaTitle', 'ctaBody', 'ctaLabel', 'ctaUrl'] },
    { label: 'Publishing', fields: ['status'] },
  ],
};

export const usesResourceFormPage = (resource: Pick<ResourceConfig, 'fields'>): boolean =>
  resource.fields.length > 5;

/** Keep every configured field, including future additions, in a group of at most five. */
export const resourceFormSteps = (
  resource: Pick<ResourceConfig, 'key' | 'fields'>,
): ResourceFormStep[] => {
  const remaining = new Map(resource.fields.map((field) => [field.name, field]));
  const steps: ResourceFormStep[] = [];
  for (const definition of STEP_DEFINITIONS[resource.key] ?? []) {
    const fields: FieldConfig[] = [];
    for (const name of definition.fields) {
      const field = remaining.get(name);
      if (field) {
        fields.push(field);
        remaining.delete(name);
      }
    }
    if (fields.length) steps.push({ label: definition.label, fields });
  }
  const ungrouped = [...remaining.values()];
  for (let index = 0; index < ungrouped.length; index += 5) {
    steps.push({
      label: steps.length ? `More details ${Math.floor(index / 5) + 1}` : 'Details',
      fields: ungrouped.slice(index, index + 5),
    });
  }
  return [...steps, { label: 'Review', fields: [] }];
};

/** Nested validation issues belong to the step containing their parent field. */
export const resourceErrorStep = (steps: ResourceFormStep[], names: readonly string[]): number =>
  Math.max(
    0,
    steps.findIndex((step) => step.fields.some((field) => names.includes(field.name))),
  );
