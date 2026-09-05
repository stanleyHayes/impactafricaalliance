import Link from '@mui/material/Link';
import { Fragment } from 'react';

/**
 * Matches bare domains and full URLs inside prose, e.g. "stanleyhayford.com"
 * or "https://ali-wa.net". Kept deliberately narrow: it needs a known-looking
 * TLD so ordinary sentences ("2026. The next") are not turned into links.
 */
const URL_PATTERN =
  /\b((?:https?:\/\/)?(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+(?:com|org|net|dev|io|africa|ng|gh|co(?:\.[a-z]{2})?)(?:\/[^\s),.]*)?)/gi;

const toHref = (value: string): string =>
  /^https?:\/\//i.test(value) ? value : `https://${value}`;

/**
 * Renders a paragraph with any web addresses in it turned into links.
 *
 * Biographies are plain text in the CMS, so a site mentioned in prose was
 * previously unclickable. Links open in a new tab, since the reader is part way
 * through a profile and losing the page would be the wrong trade.
 */
export const LinkifiedText = ({ text }: { text: string }): JSX.Element => {
  const parts = text.split(URL_PATTERN);

  return (
    <>
      {parts.map((part, index) =>
        // split() with a capturing group puts the matches at the odd indices.
        index % 2 === 1 ? (
          <Link
            key={`${part}-${index}`}
            href={toHref(part)}
            target="_blank"
            rel="noopener noreferrer"
            underline="hover"
            sx={{ color: 'primary.main', fontWeight: 600 }}
          >
            {part.replace(/^https?:\/\//i, '')}
          </Link>
        ) : (
          <Fragment key={`text-${index}`}>{part}</Fragment>
        ),
      )}
    </>
  );
};
