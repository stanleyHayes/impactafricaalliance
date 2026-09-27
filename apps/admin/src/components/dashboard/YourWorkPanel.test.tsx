import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useApplicationCounts } from '../../lib/applications';
import { useStoriesInReviewCount } from '../../lib/impact-stories';
import { useActiveProjectCount } from '../../lib/projects';
import { useTaskSummary } from '../../lib/tasks';

import { YourWorkPanel } from './YourWorkPanel';

const { auth } = vi.hoisted(() => ({
  auth: { user: { role: 'editor', permissions: [] as string[] } },
}));

vi.mock('../../auth/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('../../lib/tasks', () => ({ useTaskSummary: vi.fn() }));
vi.mock('../../lib/projects', () => ({ useActiveProjectCount: vi.fn() }));
vi.mock('../../lib/applications', () => ({ useApplicationCounts: vi.fn() }));
vi.mock('../../lib/impact-stories', () => ({ useStoriesInReviewCount: vi.fn() }));

const refetch = vi.fn();

/** A query result with just the parts the panel reads. */
const query = <T,>(data: T | undefined, state: 'pending' | 'error' | 'success' = 'success') =>
  ({
    data,
    isPending: state === 'pending',
    isError: state === 'error',
    refetch,
  }) as never;

const EVERYTHING = ['tasks:read', 'projects:read', 'applications:read', 'impact-stories:read'];

const renderPanel = (permissions: string[]): ReturnType<typeof render> => {
  auth.user.permissions = permissions;
  return render(
    <MemoryRouter>
      <YourWorkPanel />
    </MemoryRouter>,
  );
};

const tile = (name: RegExp): HTMLElement => screen.getByRole('link', { name });

beforeEach(() => {
  vi.mocked(useTaskSummary).mockReturnValue(
    query({ overdue: 2, dueToday: 1, upcoming: 4, open: 7 }),
  );
  vi.mocked(useActiveProjectCount).mockReturnValue(query(3));
  vi.mocked(useApplicationCounts).mockReturnValue(
    query({ submitted: 5, 'under-review': 1, shortlisted: 0, accepted: 0, rejected: 0 }),
  );
  vi.mocked(useStoriesInReviewCount).mockReturnValue(query(2));
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('YourWorkPanel', () => {
  it('shows each count linking to the list behind it', () => {
    renderPanel(EVERYTHING);

    expect(screen.getByRole('heading', { name: 'Your work' })).toBeInTheDocument();
    expect(tile(/Overdue/)).toHaveAttribute('href', '/tasks');
    expect(within(tile(/Overdue/)).getByText('2')).toBeInTheDocument();
    expect(within(tile(/Due today/)).getByText('1')).toBeInTheDocument();
    expect(within(tile(/Upcoming/)).getByText('4')).toBeInTheDocument();
    expect(tile(/Active projects/)).toHaveAttribute('href', '/projects?status=active');
    expect(within(tile(/Active projects/)).getByText('3')).toBeInTheDocument();
    expect(tile(/New applications/)).toHaveAttribute('href', '/applications?status=submitted');
    expect(within(tile(/New applications/)).getByText('5')).toBeInTheDocument();
    expect(tile(/Stories in review/)).toHaveAttribute('href', '/impact-stories');
    expect(within(tile(/Stories in review/)).getByText('2')).toBeInTheDocument();
  });

  it('asks only for the counts this person may open', () => {
    renderPanel(['tasks:read', 'impact-stories:read']);

    expect(tile(/Overdue/)).toBeInTheDocument();
    expect(tile(/Stories in review/)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Active projects/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /New applications/ })).not.toBeInTheDocument();
    // Applicant numbers are personal data: not even fetched without the permission.
    expect(useApplicationCounts).toHaveBeenCalledWith(false);
    expect(useActiveProjectCount).toHaveBeenCalledWith(false);
    expect(useTaskSummary).toHaveBeenCalledWith(true);
  });

  it('renders nothing for someone who can read none of the work modules', () => {
    const { container } = renderPanel(['events:read']);
    expect(container).toBeEmptyDOMElement();
  });

  it('keeps the tile layout while loading, and offers a retry when a count fails', () => {
    vi.mocked(useTaskSummary).mockReturnValue(query(undefined, 'pending'));
    vi.mocked(useActiveProjectCount).mockReturnValue(query(undefined, 'error'));
    renderPanel(['tasks:read', 'projects:read']);

    expect(tile(/Overdue/)).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText('This count could not be loaded.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
