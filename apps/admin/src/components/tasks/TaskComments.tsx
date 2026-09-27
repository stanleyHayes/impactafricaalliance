import { TASK_MENTION_PATTERN, type Task, type TaskComment } from '@iaa/shared';
import ChatBubbleOutlineRoundedIcon from '@mui/icons-material/ChatBubbleOutlineRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useRef, useState } from 'react';

import { useAuth } from '../../auth/AuthContext';
import { formatInstant } from '../../lib/forms';
import { initials } from '../../lib/initials';
import {
  TASK_COMMENTS_PAGE_SIZE,
  useCreateTaskComment,
  useDeleteTaskComment,
  useTaskComments,
  useUpdateTaskComment,
} from '../../lib/tasks';
import { relativeTime } from '../audit/ActivityTimeline';
import { ActionIcon } from '../data/ActionIcon';
import { ServerPagination, usePageParam } from '../data/ServerPagination';
import { ConfirmDialog } from '../dialogs/ConfirmDialog';
import { Markdown } from '../markdown/Markdown';

import { MentionComposer } from './MentionComposer';
import { useTaskDraft } from './task-drafts';

/** The search parameter for the page of comments, apart from the list's own `page`. */
export const COMMENTS_PAGE_PARAM = 'commentsPage';

// Characters Markdown would read as formatting inside a name.
const MARKDOWN_SPECIAL = /([\\`*_{}[\]()#+\-.!|>~])/g;

/**
 * A comment ready for the Markdown renderer: each mention token becomes a
 * bold `@Name`, with anything in the name that Markdown would read as
 * formatting escaped. Rendering the token as it is would make a link to the
 * person's id.
 */
export const renderMentions = (body: string): string =>
  body.replace(
    new RegExp(TASK_MENTION_PATTERN.source, TASK_MENTION_PATTERN.flags),
    (_token, name: string) => `**@${name.replace(MARKDOWN_SPECIAL, '\\$1')}**`,
  );

/** On the 12-hour clock the rest of the console uses: "27 Sept 2026, 4:48 pm". */
const postedOn = (iso: string): string => formatInstant(iso);

const whenPosted = (iso: string): string => relativeTime(iso) ?? postedOn(iso);

/** Editing your own comment in place. */
const CommentEditor = ({
  comment,
  taskId,
  onDone,
}: {
  comment: TaskComment;
  taskId: string;
  onDone: () => void;
}): JSX.Element => {
  const update = useUpdateTaskComment();
  const [draft, setDraft] = useState(comment.body);
  const save = (): void => {
    const body = draft.trim();
    if (!body || update.isPending) return;
    update.mutate({ taskId, commentId: comment.id, body }, { onSuccess: onDone });
  };
  return (
    <Stack spacing={1.5} sx={{ mt: 1.5 }}>
      <MentionComposer
        label="Edit comment"
        value={draft}
        onChange={setDraft}
        onSubmit={save}
        disabled={update.isPending}
        autoFocus
      />
      {update.isError && <Alert severity="error">{update.error.message}</Alert>}
      <Stack direction="row" spacing={1} justifyContent="flex-end">
        <Button onClick={onDone} disabled={update.isPending}>
          Cancel
        </Button>
        <Button variant="contained" onClick={save} disabled={update.isPending || !draft.trim()}>
          {update.isPending ? 'Saving…' : 'Save'}
        </Button>
      </Stack>
    </Stack>
  );
};

/** Asks before deleting a comment, naming whose it is and when it was posted. */
const DeleteCommentDialog = ({
  open,
  comment,
  task,
  author,
  mine,
  onClose,
}: {
  open: boolean;
  comment: TaskComment;
  task: Task;
  author: string;
  mine: boolean;
  onClose: () => void;
}): JSX.Element => {
  const remove = useDeleteTaskComment();
  // A refusal belongs to the attempt it answered: reopening starts clean.
  const close = (): void => {
    remove.reset();
    onClose();
  };
  return (
    <ConfirmDialog
      open={open}
      title={mine ? 'Delete your comment?' : `Delete ${author}'s comment?`}
      description={
        <>
          The comment {mine ? 'you' : <strong>{author}</strong>} posted on{' '}
          {postedOn(comment.createdAt)} will be removed from <strong>{task.key}</strong>. This
          cannot be undone.
        </>
      }
      confirmLabel="Delete"
      pendingLabel="Deleting…"
      tone="error"
      pending={remove.isPending}
      error={remove.isError ? remove.error.message : null}
      onConfirm={() =>
        remove.mutate({ taskId: task.id, commentId: comment.id }, { onSuccess: onClose })
      }
      onClose={close}
    />
  );
};

const commentBoxSx = {
  minWidth: 0,
  p: 1.5,
  borderRadius: 2.5,
  border: 1,
  borderColor: 'divider',
  bgcolor: 'background.paper',
} as const;

const CommentItem = ({
  comment,
  task,
  mine,
  canEdit,
  canDelete,
}: {
  comment: TaskComment;
  task: Task;
  mine: boolean;
  canEdit: boolean;
  canDelete: boolean;
}): JSX.Element => {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const author = comment.author?.name ?? 'A former colleague';

  return (
    <Box
      component="li"
      sx={{ display: 'grid', gridTemplateColumns: '36px minmax(0, 1fr)', gap: 1.5 }}
    >
      <Avatar
        aria-hidden
        sx={{
          width: 36,
          height: 36,
          fontSize: '0.8rem',
          fontWeight: 750,
          color: 'text.primary',
          bgcolor: (theme) => alpha(theme.palette.primary.main, 0.16),
        }}
      >
        {initials(author)}
      </Avatar>
      <Box sx={commentBoxSx}>
        {/* Name and time wrap in their own cell on a phone, so Edit and
            Delete stay together at the top right rather than splitting up. */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) auto',
            alignItems: 'center',
            columnGap: 1,
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1} useFlexGap flexWrap="wrap">
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {author}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              <Box
                component="time"
                dateTime={comment.createdAt}
                title={postedOn(comment.createdAt)}
              >
                {whenPosted(comment.createdAt)}
              </Box>
              {comment.editedAt ? ' · edited' : ''}
            </Typography>
          </Stack>
          <Stack direction="row" spacing={0.25} alignItems="center">
            {canEdit && !editing && (
              <ActionIcon label="Edit your comment" onClick={() => setEditing(true)}>
                <EditOutlinedIcon fontSize="small" />
              </ActionIcon>
            )}
            {canDelete && !editing && (
              <ActionIcon
                label={mine ? 'Delete your comment' : `Delete ${author}'s comment`}
                color="error"
                onClick={() => setConfirming(true)}
              >
                <DeleteOutlineRoundedIcon fontSize="small" />
              </ActionIcon>
            )}
          </Stack>
        </Box>
        {editing ? (
          <CommentEditor comment={comment} taskId={task.id} onDone={() => setEditing(false)} />
        ) : (
          <Box sx={{ '& > :first-of-type': { mt: 0.5 }, '& > :last-child': { mb: 0 } }}>
            <Markdown>{renderMentions(comment.body)}</Markdown>
          </Box>
        )}
      </Box>
      <DeleteCommentDialog
        open={confirming}
        comment={comment}
        task={task}
        author={author}
        mine={mine}
        onClose={() => setConfirming(false)}
      />
    </Box>
  );
};

const CommentsSkeleton = (): JSX.Element => (
  <Stack spacing={2} aria-hidden>
    {[0, 1].map((index) => (
      <Stack key={index} direction="row" spacing={1.5}>
        <Skeleton variant="circular" width={36} height={36} />
        <Skeleton variant="rounded" height={72} sx={{ flexGrow: 1, borderRadius: 2.5 }} />
      </Stack>
    ))}
  </Stack>
);

/**
 * The conversation on a task, oldest first, with a box to add to it.
 *
 * Mentions render as bold names. Your own comments can be edited and deleted;
 * an administrator can delete anyone's, to tidy up what the team writes.
 */
export const TaskComments = ({
  task,
  canComment,
}: {
  task: Task;
  canComment: boolean;
}): JSX.Element => {
  const { user } = useAuth();
  const page = usePageParam(COMMENTS_PAGE_PARAM);
  const comments = useTaskComments(task.id, page);
  const create = useCreateTaskComment();
  // Survives the drawer closing, so a stray Escape never loses a comment.
  const draft = useTaskDraft(task.id, 'comment');
  const headingRef = useRef<HTMLDivElement | null>(null);
  const isAdmin = user?.role === 'admin';

  const post = (): void => {
    const body = draft.value.trim();
    if (!body || create.isPending) return;
    create.mutate({ taskId: task.id, body }, { onSuccess: () => draft.clear() });
  };

  const renderList = (): JSX.Element => {
    if (comments.isPending) return <CommentsSkeleton />;
    if (comments.isError) {
      return (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => void comments.refetch()}>
              Retry
            </Button>
          }
        >
          The comments could not be loaded.
        </Alert>
      );
    }
    if (comments.data.items.length === 0) {
      return (
        <Stack direction="row" spacing={1.25} alignItems="center" sx={{ color: 'text.secondary' }}>
          <ChatBubbleOutlineRoundedIcon fontSize="small" aria-hidden />
          <Typography variant="body2">
            No comments yet. Questions, decisions and updates on this task go here.
          </Typography>
        </Stack>
      );
    }
    return (
      <Box component="ol" sx={{ listStyle: 'none', m: 0, p: 0, display: 'grid', gap: 2 }}>
        {comments.data.items.map((comment) => {
          const mine = comment.author?.id === user?.id;
          return (
            <CommentItem
              key={comment.id}
              comment={comment}
              task={task}
              mine={mine}
              canEdit={canComment && mine}
              canDelete={canComment && (mine || isAdmin)}
            />
          );
        })}
      </Box>
    );
  };

  return (
    <Stack spacing={2}>
      <Box ref={headingRef} tabIndex={-1} sx={{ outline: 'none' }}>
        {renderList()}
      </Box>
      <ServerPagination
        param={COMMENTS_PAGE_PARAM}
        totalPages={comments.data?.totalPages ?? 1}
        focusRef={headingRef}
        ariaLabel="Comment pages"
        sx={{ mt: 0 }}
      />
      {canComment ? (
        <Stack spacing={1.5}>
          <MentionComposer
            label="Add a comment"
            value={draft.value}
            onChange={draft.set}
            onSubmit={post}
            placeholder="Write an update or ask a question"
            disabled={create.isPending}
          />
          {create.isError && (
            <Alert severity="error">
              {create.error.message || 'Your comment could not be posted. Please try again.'}
            </Alert>
          )}
          <Stack direction="row" justifyContent="flex-end">
            <Button
              variant="contained"
              onClick={post}
              disabled={create.isPending || !draft.value.trim()}
            >
              {create.isPending ? 'Posting…' : 'Comment'}
            </Button>
          </Stack>
          {comments.data && comments.data.total > TASK_COMMENTS_PAGE_SIZE && (
            <Typography variant="caption" color="text.secondary">
              New comments are added to the last page.
            </Typography>
          )}
        </Stack>
      ) : (
        <Typography variant="body2" color="text.secondary">
          You can read comments but not add them. An administrator can grant you permission to
          update tasks under Users.
        </Typography>
      )}
    </Stack>
  );
};
