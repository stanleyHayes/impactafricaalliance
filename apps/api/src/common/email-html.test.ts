import { ORG } from '@iaa/shared';
import { describe, expect, it } from 'vitest';

import { emailLayout, escapeHtml, textToEmailHtml } from './email-html.js';

describe('escapeHtml', () => {
  it('escapes the five characters that can open markup or leave an attribute', () => {
    expect(escapeHtml(`<b onclick="x">Tom & Jerry's</b>`)).toBe(
      '&lt;b onclick=&quot;x&quot;&gt;Tom &amp; Jerry&#39;s&lt;/b&gt;',
    );
  });

  it('prints nothing for a missing value rather than the word undefined', () => {
    expect(escapeHtml(undefined)).toBe('');
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(42)).toBe('42');
  });
});

describe('textToEmailHtml', () => {
  it('makes paragraphs and line breaks from typed text, escaping it', () => {
    expect(textToEmailHtml('Hello <team>\nline two\n\nNew paragraph')).toBe(
      '<p>Hello &lt;team&gt;<br />line two</p><p>New paragraph</p>',
    );
  });
});

describe('emailLayout', () => {
  it('frames the body with an escaped heading and the sign-off', () => {
    const html = emailLayout({ heading: 'New <application>', bodyHtml: '<p>Body</p>' });
    expect(html).toContain('New &lt;application&gt;');
    expect(html).toContain('<p>Body</p>');
    expect(html).toContain(ORG.name);
    expect(html).not.toContain('<a ');
  });

  it('draws the button in the brand colours with an escaped label and link', () => {
    const html = emailLayout({
      heading: 'Finish your application',
      bodyHtml: '<p>Body</p>',
      action: { label: 'Carry on <now>', url: 'https://example.org/apply/x#resume="a"' },
    });
    expect(html).toContain('background:#183E33;color:#F4EDDC');
    expect(html).toContain('Carry on &lt;now&gt;');
    expect(html).toContain('href="https://example.org/apply/x#resume=&quot;a&quot;"');
  });

  it('refuses a button that is not a web link', () => {
    expect(() =>
      emailLayout({
        heading: 'x',
        bodyHtml: '',
        action: { label: 'Open', url: 'javascript:alert(1)' },
      }),
    ).toThrow(/web address/);
  });
});
