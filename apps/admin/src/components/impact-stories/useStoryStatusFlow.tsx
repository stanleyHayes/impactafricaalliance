import type { ImpactStory, ImpactStoryStatus } from '@iaa/shared';
import ArchiveOutlinedIcon from '@mui/icons-material/ArchiveOutlined';
import PublicOffOutlinedIcon from '@mui/icons-material/PublicOffOutlined';
import PublicOutlinedIcon from '@mui/icons-material/PublicOutlined';
import { useState, type ReactNode } from 'react';

import { ApiError } from '../../lib/api-client';
import { useChangeImpactStoryStatus, type StoryStatusAction } from '../../lib/impact-stories';
import { ConfirmDialog } from '../dialogs/ConfirmDialog';

/** The story a status control acts on. */
export interface StatusTarget {
  id: string;
  title: string;
  status: ImpactStoryStatus;
}

/**
 * What an API refusal says, including each publishing problem it lists, so
 * "not ready to publish" arrives with the reasons rather than without them.
 */
export const storyErrorText = (error: unknown): string => {
  if (!(error instanceof Error)) return 'Something went wrong. Try again.';
  const details = error instanceof ApiError && Array.isArray(error.details) ? error.details : [];
  const reasons = details
    .map((detail: unknown) =>
      typeof detail === 'object' && detail !== null && 'message' in detail
        ? String((detail as { message: unknown }).message)
        : '',
    )
    .filter(Boolean);
  return reasons.length > 0 ? `${error.message}: ${reasons.join(' ')}` : error.message;
};

interface ConfirmCopy {
  title: string;
  body: (title: string, status: ImpactStoryStatus) => ReactNode;
  confirm: string;
  icon: ReactNode;
}

const PUBLISH: ConfirmCopy = {
  title: 'Publish this story?',
  body: (title) => (
    <>
      <strong>{title}</strong> will appear on the website under Impact stories, where anyone can
      read and share it.
    </>
  ),
  confirm: 'Publish',
  icon: <PublicOutlinedIcon />,
};

const UNPUBLISH: ConfirmCopy = {
  title: 'Take this story off the website?',
  body: (title) => (
    <>
      <strong>{title}</strong> will return to draft, and its page on the website will stop working
      until it is published again.
    </>
  ),
  confirm: 'Unpublish',
  icon: <PublicOffOutlinedIcon />,
};

const ARCHIVE: ConfirmCopy = {
  title: 'Archive this story?',
  body: (title, status) => (
    <>
      <strong>{title}</strong> will move to the archive
      {status === 'published' ? ' and come off the website' : ''}. It can be restored as a draft
      later.
    </>
  ),
  confirm: 'Archive',
  icon: <ArchiveOutlinedIcon />,
};

const confirmCopy = (action: StoryStatusAction): ConfirmCopy => {
  if (action.to === 'published') return PUBLISH;
  if (action.to === 'archived') return ARCHIVE;
  return UNPUBLISH;
};

export interface StoryStatusFlow {
  /** Make the move, asking first when it changes what the public sees. */
  request: (action: StoryStatusAction) => void;
  /** The confirmation dialog; render it once, anywhere. */
  dialog: JSX.Element;
  pending: boolean;
  /** Why a move made without confirmation failed. */
  error: string | null;
  clearError: () => void;
}

/**
 * Status moves for one story. Moves that change the website (publish,
 * unpublish, archive) are confirmed in a dialog naming the story; submitting
 * for review and returning to draft happen at once.
 */
export const useStoryStatusFlow = (
  story: StatusTarget,
  onChanged?: (story: ImpactStory) => void,
): StoryStatusFlow => {
  const change = useChangeImpactStoryStatus();
  const [confirming, setConfirming] = useState<StoryStatusAction | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = (action: StoryStatusAction): void => {
    setError(null);
    change.mutate(
      { id: story.id, status: action.to },
      {
        onSuccess: (updated) => {
          setConfirming(null);
          onChanged?.(updated);
        },
        onError: (cause) => setError(storyErrorText(cause)),
      },
    );
  };
  const request = (action: StoryStatusAction): void => {
    setError(null);
    if (action.confirm) setConfirming(action);
    else run(action);
  };
  const copy = confirming ? confirmCopy(confirming) : PUBLISH;

  const dialog = (
    <ConfirmDialog
      open={confirming !== null}
      eyebrow="Impact story"
      title={copy.title}
      description={copy.body(story.title, story.status)}
      confirmLabel={copy.confirm}
      icon={copy.icon}
      tone={confirming?.to === 'published' ? 'default' : 'error'}
      pending={change.isPending}
      error={confirming ? error : null}
      onConfirm={() => {
        if (confirming) run(confirming);
      }}
      onClose={() => {
        if (change.isPending) return;
        setConfirming(null);
        setError(null);
      }}
    />
  );

  return {
    request,
    dialog,
    pending: change.isPending,
    error: confirming ? null : error,
    clearError: () => setError(null),
  };
};
