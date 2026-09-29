import type { ImpactStory, Permission, PublicUser } from '@iaa/shared';
import { ThemeProvider } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { api } from '../../lib/api-client';
import { goToStep } from '../../test/step-menu';
import { theme } from '../../theme/theme';

import ImpactStoryEditorPage from './ImpactStoryEditorPage';

const auth: { user: Partial<PublicUser> } = { user: {} };
vi.mock('../../auth/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('../../lib/api-client', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const WRITER: Permission[] = [
  'impact-stories:read',
  'impact-stories:create',
  'impact-stories:update',
];

const signIn = (role: 'admin' | 'editor'): void => {
  auth.user = { role, permissions: WRITER };
};

const story: ImpactStory = {
  id: '64b000000000000000000001',
  title: 'Girls in code',
  slug: 'girls-in-code',
  excerpt: 'How forty girls in Tamale wrote their first programs.',
  cover: null,
  projectId: null,
  project: null,
  status: 'in-review',
  blocks: [{ id: 'text-1', type: 'rich-text', data: { markdown: 'It began with a laptop.' } }],
  tags: [],
  programme: null,
  seo: null,
  publishedAt: null,
  schemaVersion: 1,
  createdAt: '2026-09-20T10:00:00.000Z',
  updatedAt: '2026-09-21T10:00:00.000Z',
};

const clients: QueryClient[] = [];

const mount = (entry: string | { pathname: string; state: unknown }): void => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  clients.push(client);
  render(
    <QueryClientProvider client={client}>
      <ThemeProvider theme={theme}>
        <MemoryRouter initialEntries={[entry]}>
          <Routes>
            <Route path="/impact-stories/new" element={<ImpactStoryEditorPage />} />
            <Route path="/impact-stories/:storyId/edit" element={<ImpactStoryEditorPage />} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>,
  );
};

const form = (): HTMLFormElement =>
  screen.getByRole('button', { name: /Continue|Create story|Save story/ }).closest('form')!;

/** Enter in a single-line field submits the form, which moves on a step. */
const pressEnter = (): void => {
  fireEvent.submit(form());
};

const stepHeading = (name: string): HTMLElement => screen.getByRole('heading', { level: 2, name });

beforeEach(() => signIn('editor'));

afterEach(() => {
  cleanup();
  clients.forEach((client) => client.clear());
  clients.length = 0;
  vi.clearAllMocks();
});

describe('ImpactStoryEditorPage', () => {
  it('holds a step until it is complete, and Enter moves on without saving', async () => {
    mount('/impact-stories/new');
    expect(stepHeading('Basics')).toBeInTheDocument();

    pressEnter();
    expect(stepHeading('Basics')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Fix the problems marked on this step');
    expect(screen.getByText('The title needs at least 3 characters.')).toBeInTheDocument();

    fireEvent.change(screen.getByRole('textbox', { name: /Title/ }), {
      target: { value: 'Girls in code' },
    });
    // The address follows the title until someone edits it.
    expect(screen.getByRole('textbox', { name: /Web address/ })).toHaveValue('girls-in-code');
    fireEvent.change(screen.getByRole('textbox', { name: /Excerpt/ }), {
      target: { value: 'How forty girls wrote their first programs.' },
    });
    pressEnter();
    await waitFor(() => expect(stepHeading('Classification')).toBeInTheDocument());

    pressEnter();
    await waitFor(() => expect(stepHeading('Blocks')).toBeInTheDocument());
    expect(api.post).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
  });

  it('keeps the Blocks step shut while a block is unfinished', async () => {
    vi.mocked(api.get).mockResolvedValue(story);
    mount({ pathname: `/impact-stories/${story.id}/edit`, state: { step: 2 } });
    await waitFor(() => expect(stepHeading('Blocks')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Add block' }));
    fireEvent.click(screen.getByRole('menuitem', { name: /Image/ }));
    // The menu hides the page from assistive technology until it has closed.
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
    pressEnter();

    expect(stepHeading('Blocks')).toBeInTheDocument();
    expect(
      screen.getByText('Finish or remove the blocks marked below before you continue.'),
    ).toBeInTheDocument();
  });

  it('saves the whole story from the Review step and nowhere else', async () => {
    vi.mocked(api.get).mockResolvedValue(story);
    vi.mocked(api.patch).mockResolvedValue({ ...story, title: 'Girls in code, year one' });
    mount({ pathname: `/impact-stories/${story.id}/edit`, state: { step: 0 } });
    await waitFor(() => expect(stepHeading('Basics')).toBeInTheDocument());

    fireEvent.change(screen.getByRole('textbox', { name: /Title/ }), {
      target: { value: 'Girls in code, year one' },
    });
    for (const next of ['Classification', 'Blocks', 'Search & sharing', 'Review']) {
      pressEnter();
      await waitFor(() => expect(stepHeading(next)).toBeInTheDocument());
    }
    expect(api.patch).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Save story' }));
    await waitFor(() => expect(api.patch).toHaveBeenCalledTimes(1));
    expect(vi.mocked(api.patch).mock.calls[0]?.[0]).toBe(`/admin/impact-stories/${story.id}`);
    expect(vi.mocked(api.patch).mock.calls[0]?.[1]).toMatchObject({
      title: 'Girls in code, year one',
      // A PATCH clears what was removed rather than leaving it out.
      seo: null,
      country: null,
    });
  });

  it('offers an editor review moves only, and an administrator publishing', async () => {
    vi.mocked(api.get).mockResolvedValue(story);
    mount({ pathname: `/impact-stories/${story.id}/edit`, state: { step: 4 } });
    await waitFor(() => expect(stepHeading('Review')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Return to draft' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Publish' })).not.toBeInTheDocument();
    expect(screen.getByText(/Only an administrator can publish/)).toBeInTheDocument();

    cleanup();
    signIn('admin');
    mount({ pathname: `/impact-stories/${story.id}/edit`, state: { step: 4 } });
    await waitFor(() => expect(stepHeading('Review')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Publish' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Archive' })).toBeInTheDocument();
    // The checklist says what publishing still needs.
    expect(
      screen.getByText('Add a cover image, or an image to the hero block.'),
    ).toBeInTheDocument();
  });

  it('reviews with the shared summary: Not set for gaps, and an Edit button per step', async () => {
    vi.mocked(api.get).mockResolvedValue(story);
    mount({ pathname: `/impact-stories/${story.id}/edit`, state: { step: 4 } });
    await waitFor(() => expect(stepHeading('Review')).toBeInTheDocument());
    const classification = screen.getByRole('region', { name: 'Classification' });
    // No project, programme, country or tags: said in words, not a dash.
    expect(within(classification).getAllByText('Not set')).toHaveLength(4);
    expect(screen.queryByText('—')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Edit classification' }));
    await waitFor(() => expect(stepHeading('Classification')).toBeInTheDocument());
  });

  it('shows a published story read-only to an editor', async () => {
    vi.mocked(api.get).mockResolvedValue({ ...story, status: 'published' });
    mount(`/impact-stories/${story.id}/edit`);
    expect(
      await screen.findByText(
        /This story is on the website, so only an administrator can change it/,
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /Title/ })).toBeDisabled();
    // The upload field has no switch of its own; the step's fieldset covers it.
    expect(screen.getByText('Cover image').closest('fieldset')).toBeDisabled();
    await goToStep(1);
    expect(stepHeading('Classification')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Tags' })).toBeDisabled();
  });

  it('says when a story cannot be loaded and offers a retry', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('Impact story not found'));
    mount(`/impact-stories/${story.id}/edit`);
    expect(await screen.findByText('Impact story not found')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});
