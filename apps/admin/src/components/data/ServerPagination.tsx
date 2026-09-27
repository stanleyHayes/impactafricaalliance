import FirstPageRoundedIcon from '@mui/icons-material/FirstPageRounded';
import Pagination from '@mui/material/Pagination';
import type { SxProps, Theme } from '@mui/material/styles';
import type { RefObject } from 'react';
import { useSearchParams } from 'react-router-dom';

import { EmptyState } from '../EmptyState';

/**
 * The page number held in the address, 1 when it is missing or not a whole
 * number above zero.
 *
 * Kept in the address rather than in state so a page can be bookmarked,
 * shared and returned to with Back. Pages whose lists sit side by side (a
 * task list and the activity inside its drawer) use different parameters.
 */
export const usePageParam = (param = 'page'): number => {
  const [searchParams] = useSearchParams();
  const page = Number(searchParams.get(param));
  return Number.isInteger(page) && page > 0 ? page : 1;
};

export interface ServerPaginationProps {
  /** From the `Paginated` envelope. Nothing renders for a single page. */
  totalPages: number;
  /** The search parameter that holds the page. */
  param?: string;
  /**
   * Where focus goes after a page change, usually the list's heading, with
   * `tabIndex={-1}` so it can take focus. Without it, a keyboard or screen
   * reader user is left on the pagination control at the foot of a list that
   * has just been replaced above them.
   */
  focusRef?: RefObject<HTMLElement | null>;
  /** Names the control for screen readers, such as "Task pages". */
  ariaLabel?: string;
  sx?: SxProps<Theme>;
}

/**
 * Page links for a list paged by the API, bound to a search parameter.
 *
 * The console's own table pages in the browser, which is fine for a few
 * hundred CMS records but not for tasks or applications, whose lists grow
 * without end. Those ask the API for one page at a time and use this.
 */
export const ServerPagination = ({
  totalPages,
  param = 'page',
  focusRef,
  ariaLabel = 'Pages',
  sx,
}: ServerPaginationProps): JSX.Element | null => {
  const [, setSearchParams] = useSearchParams();
  const page = usePageParam(param);

  if (totalPages <= 1) return null;

  const goTo = (next: number): void => {
    setSearchParams((current) => {
      const updated = new URLSearchParams(current);
      // Page 1 is the default, so it leaves the address clean rather than ?page=1.
      if (next === 1) updated.delete(param);
      else updated.set(param, String(next));
      return updated;
    });
    focusRef?.current?.focus();
  };

  return (
    <Pagination
      count={totalPages}
      page={Math.min(page, totalPages)}
      onChange={(_event, next) => goTo(next)}
      shape="rounded"
      aria-label={ariaLabel}
      // The array form keeps a caller's sx working whether it is an object,
      // a function of the theme or a list of both.
      sx={[
        { mt: 3, '& .MuiPagination-ul': { justifyContent: 'center' } },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    />
  );
};

export interface OutOfRangePageProps {
  /** Records in the whole view, from the `Paginated` envelope. */
  total: number;
  /** What the list holds, one of them: "task", "application". */
  noun: string;
  /** More than one, when it is not the noun with an "s": "stories". */
  plural?: string;
  /** The search parameter that holds the page. */
  param?: string;
  compact?: boolean;
}

/**
 * What a paged list shows when the address is past its last page: an old
 * link, or the last item on the last page moved away by a status change or a
 * delete. The API answers such a page with no items and the true total, so
 * the list's own "nothing here yet" state would claim there is nothing at all
 * under a header counting dozens. Render this first, whenever a page has no
 * items but the total is not zero.
 */
export const OutOfRangePage = ({
  total,
  noun,
  plural = `${noun}s`,
  param = 'page',
  compact = true,
}: OutOfRangePageProps): JSX.Element => {
  const [, setSearchParams] = useSearchParams();
  const firstPage = (): void =>
    setSearchParams((current) => {
      const updated = new URLSearchParams(current);
      updated.delete(param);
      return updated;
    });
  return (
    <EmptyState
      compact={compact}
      icon={<FirstPageRoundedIcon />}
      title="Nothing on this page"
      description={`There ${total === 1 ? `is 1 ${noun}` : `are ${total.toLocaleString()} ${plural}`} in this view, on earlier pages.`}
      primaryAction={{ label: 'Go to the first page', onClick: firstPage, variant: 'outlined' }}
    />
  );
};
