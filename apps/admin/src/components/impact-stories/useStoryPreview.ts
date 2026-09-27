import { useState } from 'react';

import { useImpactStoryPreviewLink } from '../../lib/impact-stories';

export interface StoryPreviewOpener {
  open: (id: string) => void;
  pending: boolean;
  error: string | null;
  clearError: () => void;
}

/**
 * Opens a story's preview on the real website in a new tab.
 *
 * The tab is opened straight away, inside the click, and pointed at the
 * preview once the link arrives: browsers block a window opened later from a
 * network callback as a pop-up. Its link back to this tab is cut before it
 * leaves, so the website can never reach into the console.
 */
export const useStoryPreview = (): StoryPreviewOpener => {
  const link = useImpactStoryPreviewLink();
  const [error, setError] = useState<string | null>(null);

  const open = (id: string): void => {
    setError(null);
    const tab = window.open('', '_blank');
    if (tab) tab.opener = null;
    link.mutate(id, {
      onSuccess: ({ url }) => {
        if (tab) tab.location.href = url;
        else window.open(url, '_blank', 'noopener');
      },
      onError: (cause) => {
        tab?.close();
        setError(cause.message || 'The preview could not be opened. Try again.');
      },
    });
  };

  return { open, pending: link.isPending, error, clearError: () => setError(null) };
};
