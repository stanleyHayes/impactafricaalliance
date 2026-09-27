import { bodyToHtml, ORG } from '@iaa/shared';

/**
 * Make any value safe to place inside HTML text or a quoted attribute.
 *
 * Four services each carry their own copy of this; new code imports it from
 * here so there is one version to trust. Names, titles and answers typed by
 * the public reach these emails, and an unescaped `<` in someone's name would
 * otherwise become markup in a colleague's inbox.
 */
export const escapeHtml = (value: unknown): string =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] ??
      character,
  );

/**
 * Plain text as email paragraphs: blank lines start a new paragraph and single
 * line breaks are kept. Escapes everything, so it is safe for text a person
 * typed.
 */
export const textToEmailHtml = (text: string): string => bodyToHtml(text, escapeHtml);

/** The one button an email may carry. */
export interface EmailAction {
  label: string;
  url: string;
}

export interface EmailLayoutInput {
  /** Plain text; escaped here. */
  heading: string;
  /**
   * Ready-made HTML for the body. The caller escapes anything it did not
   * write itself, with `escapeHtml` or `textToEmailHtml`.
   */
  bodyHtml: string;
  action?: EmailAction;
}

// A link in an email is opened by the reader's mail client with no further
// checks, so only web addresses are ever turned into a button.
const WEB_URL = /^https?:\/\//i;

// The colours of the event and review emails, so every message from the
// organisation looks like it came from the same place: the forest green of
// the site's buttons on its cream.
const BRAND_GREEN = '#183E33';
const BRAND_CREAM = '#F4EDDC';

/**
 * Wrap an email body in the organisation's standard frame: a heading, the
 * body, an optional button, and the sign-off line.
 *
 * Throws when the button's address is not a web link. The link is built by
 * our own code from configuration, so anything else is a bug, and a
 * `javascript:` link in an email is not something to send quietly. Callers
 * send email best-effort inside a try, so the throw is logged, not shown.
 */
export const emailLayout = ({ heading, bodyHtml, action }: EmailLayoutInput): string => {
  if (action && !WEB_URL.test(action.url)) {
    throw new Error('Email buttons must link to a web address');
  }
  const button = action
    ? `<p style="margin:24px 0"><a href="${escapeHtml(action.url)}" style="background:${BRAND_GREEN};color:${BRAND_CREAM};padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:700;display:inline-block">${escapeHtml(action.label)}</a></p>`
    : '';
  return [
    '<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;color:#0A0F0D;line-height:1.5">',
    `<h2 style="color:${BRAND_GREEN};margin:0 0 16px">${escapeHtml(heading)}</h2>`,
    bodyHtml,
    button,
    `<p style="color:#666;font-size:13px;margin-top:28px">${escapeHtml(ORG.name)} — ${escapeHtml(ORG.tagline)}</p>`,
    '</div>',
  ].join('');
};
