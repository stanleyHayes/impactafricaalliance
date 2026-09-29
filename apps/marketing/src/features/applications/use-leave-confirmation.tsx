import { useState, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { ConfirmDialog } from '../../components/ConfirmDialog';

import type { LeaveRisk } from './use-form-session';

type Risk = Exclude<LeaveRisk, null>;

const MESSAGES: Record<Risk, string> = {
  uploading:
    'A file is still uploading. If you leave now, it will not be added to your application.',
  unsaved:
    'We have not been able to save your latest changes yet. If you leave now, they may be lost. Staying gives saving another chance.',
  'no-drafts':
    'This form cannot be saved part-way through, so if you leave now your answers will be lost.',
};

/** A click that opens the link in a new tab or window, which leaves this page as it is. */
const opensElsewhere = (event: MouseEvent<HTMLAnchorElement>): boolean =>
  event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;

/**
 * Asking before the logo takes someone out of the flow, when going would
 * lose something (see `LeaveRisk`). When nothing would be lost, the link just
 * works.
 *
 * This is the flow's replacement for the browser's "Leave site?" prompt. That
 * prompt could not say what was at risk, looked like an error from the
 * browser, and appeared even when autosave already had every answer.
 */
export const useLeaveConfirmation = (leaveRisk: () => LeaveRisk) => {
  const navigate = useNavigate();
  // The risk is kept while the dialog fades out, so its words do not vanish first.
  const [asking, setAsking] = useState<{ open: boolean; risk: Risk }>({
    open: false,
    risk: 'no-drafts',
  });

  const onHomeClick = (event: MouseEvent<HTMLAnchorElement>): void => {
    if (opensElsewhere(event)) {
      return;
    }
    const risk = leaveRisk();
    if (risk) {
      event.preventDefault();
      setAsking({ open: true, risk });
    }
  };

  const stay = (): void => setAsking((current) => ({ ...current, open: false }));
  const leave = (): void => {
    stay();
    navigate('/');
  };

  const dialog = (
    <ConfirmDialog
      open={asking.open}
      title="Leave your application?"
      description={MESSAGES[asking.risk]}
      confirmLabel="Leave"
      cancelLabel="Stay and carry on"
      tone="error"
      onConfirm={leave}
      onClose={stay}
    />
  );

  return { onHomeClick, dialog };
};
