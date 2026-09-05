import type { SiteSettingUpdateInput } from '@iaa/shared';
import type { FieldPath } from 'react-hook-form';

export interface SiteSettingField {
  name: FieldPath<SiteSettingUpdateInput>;
  label: string;
  type?: 'email' | 'url' | 'number' | 'switch';
  helperText?: string;
  multiline?: boolean;
}

export interface SiteSettingStep {
  label: string;
  title: string;
  description: string;
  fields: readonly SiteSettingField[];
}

/** Keep the full settings form in focused groups of at most five editable fields. */
export const SITE_SETTING_STEPS: readonly SiteSettingStep[] = [
  {
    label: 'Organisation',
    title: 'Your organisation',
    description: 'Set the name and short introduction used across the public site.',
    fields: [
      { name: 'siteName', label: 'Site name' },
      { name: 'tagline', label: 'Tagline' },
    ],
  },
  {
    label: 'Contact',
    title: 'How people can reach you',
    description: 'Keep the main contact channels and alternate office line up to date.',
    fields: [
      { name: 'contactEmail', label: 'Contact email', type: 'email' },
      { name: 'contactPhone', label: 'Phone' },
      {
        name: 'whatsappPhone',
        label: 'WhatsApp',
        helperText: 'Leave blank to reuse the phone number above.',
      },
      {
        name: 'alternatePhone',
        label: 'Alternate phone',
        helperText: 'A second office line, such as the Nigeria number.',
      },
      {
        name: 'alternatePhoneLabel',
        label: 'Alternate phone label',
        helperText: 'Shown as the heading, such as Nigeria.',
      },
    ],
  },
  {
    label: 'Address',
    title: 'Your main office',
    description: 'This address appears in the public contact information.',
    fields: [
      { name: 'addressLine1', label: 'Address line 1' },
      { name: 'addressLine2', label: 'Address line 2' },
      { name: 'city', label: 'City' },
      { name: 'country', label: 'Country' },
    ],
  },
  {
    label: 'Presence',
    title: 'Location and regional presence',
    description: 'Help visitors find your office and see where the alliance works.',
    fields: [
      { name: 'region', label: 'Region / state' },
      { name: 'postalCode', label: 'Postal code' },
      {
        name: 'regionalPresence',
        label: 'Regional presence',
        helperText: 'Separate countries with commas, for example Nigeria, Sierra Leone.',
      },
      {
        name: 'mapUrl',
        label: 'Map URL',
        type: 'url',
        helperText: 'Link to Google Maps or another map service.',
      },
    ],
  },
  {
    label: 'Banner',
    title: 'Announcement banner',
    description: 'Share a timely message across the top of every public page.',
    fields: [
      { name: 'announcement.enabled', label: 'Show the announcement banner', type: 'switch' },
      { name: 'announcement.message', label: 'Message', multiline: true },
      { name: 'announcement.linkUrl', label: 'Link URL', type: 'url' },
      { name: 'announcement.linkLabel', label: 'Link label', helperText: 'For example, Register.' },
    ],
  },
  {
    label: 'Welcome',
    title: 'Welcome popup',
    description: 'Introduce a campaign or invitation to first-time visitors.',
    fields: [
      { name: 'popup.enabled', label: 'Show a welcome popup', type: 'switch' },
      { name: 'popup.title', label: 'Title' },
      { name: 'popup.message', label: 'Message', multiline: true },
      { name: 'popup.imageUrl', label: 'Image URL (optional)', type: 'url' },
    ],
  },
  {
    label: 'Popup action',
    title: 'Popup action and timing',
    description: 'Choose where the welcome popup leads and when it appears.',
    fields: [
      { name: 'popup.ctaLabel', label: 'Button label' },
      { name: 'popup.ctaUrl', label: 'Button link', type: 'url' },
      {
        name: 'popup.delaySeconds',
        label: 'Delay (seconds)',
        type: 'number',
        helperText: 'Wait from 0 to 60 seconds after the page loads.',
      },
    ],
  },
  {
    label: 'Social profiles',
    title: 'Social profiles',
    description: 'Add the profiles visitors can follow for news and updates.',
    fields: [
      { name: 'socials.facebook', label: 'Facebook', type: 'url' },
      { name: 'socials.x', label: 'X (Twitter)', type: 'url' },
      { name: 'socials.instagram', label: 'Instagram', type: 'url' },
      { name: 'socials.linkedin', label: 'LinkedIn', type: 'url' },
    ],
  },
  {
    label: 'Video & chat',
    title: 'Video channels and live chat',
    description: 'Finish your public channels, then save all your settings together.',
    fields: [
      { name: 'socials.youtube', label: 'YouTube', type: 'url' },
      { name: 'socials.tiktok', label: 'TikTok', type: 'url' },
      { name: 'liveChat.enabled', label: 'Show a WhatsApp chat button', type: 'switch' },
      {
        name: 'liveChat.label',
        label: 'Chat button label',
        helperText: 'Defaults to Chat with us.',
      },
      {
        name: 'liveChat.greeting',
        label: 'Pre-filled message',
        multiline: true,
        helperText: 'The start of the visitor’s message when WhatsApp opens.',
      },
    ],
  },
];

export const getSettingPath = (object: unknown, path: string): unknown =>
  path.split('.').reduce<unknown>((current, key) => {
    if (current && typeof current === 'object') {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, object);

/** Select the first affected step so hidden errors are always reachable after saving. */
export const firstInvalidSettingStep = (errors: unknown): number =>
  SITE_SETTING_STEPS.findIndex((step) =>
    step.fields.some((field) => Boolean(getSettingPath(errors, field.name))),
  );
