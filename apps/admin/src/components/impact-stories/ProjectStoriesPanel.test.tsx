import type { ImpactStoryListItem, Permission, PublicUser } from '@iaa/shared';
import { ThemeProvider } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { api } from '../../lib/api-client';
import { theme } from '../../theme/theme';

import { ProjectStoriesPanel } from './ProjectStoriesPanel';

const auth: { user: Partial<PublicUser> } = { user: {} };
vi.mock('../../auth/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('../../lib/api-client', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  api: { get: vi.fn() },
}));

const PROJECT = '64b0000000000000000000aa';

const story: ImpactStoryListItem = {
  id: '64b000000000000000000001',
  title: 'Coding clubs, year one',
  slug: 'coding-clubs-story',
  excerpt: 'How forty girls wrote their first programs.',
  status: 'in-review',
  projectId: PROJECT,
  tags: [],
  blockCount: 4,
  createdAt: '2026-09-20T10:00:00.000Z',
  updatedAt: '2026-09-21T10:00:00.000Z',
};

const mount = (permissions: Permission[]): void => {
  auth.user = { role: 'editor', permissions };
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <ThemeProvider theme={theme}>
        <MemoryRouter>
          <ProjectStoriesPanel projectId={PROJECT} />
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>,
  );
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('ProjectStoriesPanel', () => {
  it('lists the project’s stories in any status and offers another', async () => {
    vi.mocked(api.get).mockResolvedValue({
      items: [story],
      page: 1,
      pageSize: 50,
      total: 1,
      totalPages: 1,
    });
    mount([
      'impact-stories:read',
      'impact-stories:create',
      'impact-stories:update',
      'projects:read',
    ]);

    expect(await screen.findByRole('link', { name: 'Coding clubs, year one' })).toHaveAttribute(
      'href',
      `/impact-stories/${story.id}/edit`,
    );
    expect(screen.getByText('In review')).toBeInTheDocument();
    expect(vi.mocked(api.get).mock.calls[0]?.[0]).toBe(
      `/admin/impact-stories?view=all&page=1&pageSize=50&projectId=${PROJECT}`,
    );
    expect(screen.getByRole('button', { name: 'Create impact story' })).toBeInTheDocument();
    expect(
      screen.getByText(/Completing a project never publishes anything by itself/),
    ).toBeInTheDocument();
  });

  it('is a card section like Impact numbers and Risks, with its action in the header', async () => {
    vi.mocked(api.get).mockResolvedValue({
      items: [story],
      page: 1,
      pageSize: 50,
      total: 1,
      totalPages: 1,
    });
    mount([
      'impact-stories:read',
      'impact-stories:create',
      'impact-stories:update',
      'projects:read',
    ]);

    const section = screen.getByRole('region', { name: 'Impact stories' });
    expect(section.tagName).toBe('SECTION');
    expect(
      within(section).getByRole('heading', { level: 2, name: 'Impact stories' }),
    ).toBeInTheDocument();
    expect(await within(section).findByText('Coding clubs, year one')).toBeInTheDocument();
    // A text button, as the other sections' Add buttons are, not a filled one.
    const create = within(section).getByRole('button', { name: 'Create impact story' });
    expect(create.className).toContain('MuiButton-text');
    expect(create.className).not.toContain('MuiButton-contained');
  });

  it('is not there at all when stories cannot be read', () => {
    mount(['projects:read']);
    expect(screen.queryByText(/impact stor/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/An administrator can grant/)).not.toBeInTheDocument();
    expect(api.get).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Create impact story' })).not.toBeInTheDocument();
  });
});
