import type { ImpactStory } from '@iaa/shared';
import { ThemeProvider } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { MemoryRouter, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { api } from '../../lib/api-client';
import { theme } from '../../theme/theme';

import StoryFromProjectPage from './StoryFromProjectPage';

vi.mock('../../lib/api-client', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const EditorStub = (): JSX.Element => {
  const { storyId } = useParams();
  const location = useLocation();
  const state = location.state as { notice?: string } | null;
  return (
    <p>
      Editing {storyId}: {state?.notice}
    </p>
  );
};

const mount = (): void => {
  render(
    <StrictMode>
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <ThemeProvider theme={theme}>
          <MemoryRouter initialEntries={['/impact-stories/from-project/64b0000000000000000000aa']}>
            <Routes>
              <Route
                path="/impact-stories/from-project/:projectId"
                element={<StoryFromProjectPage />}
              />
              <Route path="/impact-stories/:storyId/edit" element={<EditorStub />} />
            </Routes>
          </MemoryRouter>
        </ThemeProvider>
      </QueryClientProvider>
    </StrictMode>,
  );
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('StoryFromProjectPage', () => {
  it('creates one draft from the project and opens it in the editor', async () => {
    vi.mocked(api.post).mockResolvedValue({ id: 'story-1', title: 'Coding clubs' } as ImpactStory);
    mount();
    expect(screen.getByText('Copying the project into a new draft…')).toBeInTheDocument();

    expect(await screen.findByText(/Editing story-1/)).toBeInTheDocument();
    expect(
      screen.getByText(/Nothing is public until an administrator publishes it/),
    ).toBeInTheDocument();
    // Strict mode runs effects twice; the draft is still only created once.
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.post).toHaveBeenCalledWith(
      '/admin/impact-stories/from-project/64b0000000000000000000aa',
      {},
    );
  });

  it('explains a failure, offers a retry and a way back to the project', async () => {
    vi.mocked(api.post).mockRejectedValueOnce(new Error('Project not found'));
    mount();

    expect(
      await screen.findByText(/The draft could not be created. Project not found/),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to the project' })).toHaveAttribute(
      'href',
      '/projects/64b0000000000000000000aa',
    );

    vi.mocked(api.post).mockResolvedValueOnce({
      id: 'story-2',
      title: 'Coding clubs',
    } as ImpactStory);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(screen.getByText(/Editing story-2/)).toBeInTheDocument());
  });
});
