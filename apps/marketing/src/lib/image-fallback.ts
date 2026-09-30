import { useCallback, useEffect, useState } from 'react';

/**
 * Pictures that fall back to the next choice when the browser cannot load them.
 *
 * An upload can be deleted from Cloudinary, or saved with an address that
 * never worked. An `<img>` then shows a broken-image icon and a CSS
 * background shows nothing at all, leaving a banner as a flat dark block.
 * Every picture the dashboard controls is therefore a short list of
 * candidates: the dashboard's choice, then anything it shares, then the file
 * shipped with the build. A failure moves on to the next one. The last
 * candidate is never skipped, because it is the shipped file and skipping it
 * would leave nothing to draw.
 */

type Candidate = string | null | undefined;

/** The candidates in order, without blanks or repeats. */
const distinct = (candidates: readonly Candidate[]): string[] => [
  ...new Set(candidates.filter((candidate): candidate is string => Boolean(candidate))),
];

export interface ImageChoice {
  /** The first candidate that has not failed, or the last one. */
  src: string;
  /** True while `src` is the last candidate: the shipped file, trusted to load. */
  isLast: boolean;
  /** Passes over `src` when the browser reports that it cannot load it. */
  onError: () => void;
}

/**
 * The first candidate that loads, for an `<img>`: pass `onError` to it.
 *
 * Failures are remembered by address, so when the dashboard answers with a
 * new picture it is tried afresh rather than skipped.
 */
export const useImageFallback = (candidates: readonly Candidate[]): ImageChoice => {
  const list = distinct(candidates);
  const [failed, setFailed] = useState<readonly string[]>([]);
  const last = list.length - 1;
  const index = Math.max(
    0,
    list.findIndex((candidate, position) => position === last || !failed.includes(candidate)),
  );
  const src = list[index] ?? '';
  const onError = useCallback(() => {
    setFailed((previous) => (previous.includes(src) ? previous : [...previous, src]));
  }, [src]);
  return { src, isLast: index >= last, onError };
};

/**
 * The first candidate that loads, for a CSS background.
 *
 * A background has no error event, so the browser is asked for the same
 * address as an image. The two requests are for one URL, so the browser
 * downloads it once. The shipped file is not checked, which keeps a page
 * nobody has changed in the dashboard exactly as it was.
 */
export const useBackgroundFallback = (candidates: readonly Candidate[]): string => {
  const { src, isLast, onError } = useImageFallback(candidates);
  useEffect(() => {
    if (isLast || !src || typeof Image === 'undefined') return undefined;
    const probe = new Image();
    probe.onerror = onError;
    probe.src = src;
    return () => {
      probe.onerror = null;
    };
  }, [src, isLast, onError]);
  return src;
};

/**
 * A picture's address as a CSS `url()`, quoted.
 *
 * Unquoted, an address holding a bracket, a quote or a space ends the
 * `url()` early: the banner goes blank, and whatever follows is read as more
 * CSS. Quoting and escaping keeps it one value, whatever it contains.
 */
export const cssUrl = (src: string): string =>
  `url("${src.replace(/[\n\r\f]/g, '').replace(/["\\]/g, '\\$&')}")`;
