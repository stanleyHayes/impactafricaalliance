import type { PublicImpactStory } from '@iaa/shared';
import { ThemeProvider } from '@mui/material/styles';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useImpactStoryPreview } from '../features/impact-stories/api';
import { ApiError } from '../lib/api-client';
import { theme } from '../theme/theme';

import ImpactStoryPreview from './ImpactStoryPreview';

vi.mock('../features/impact-stories/api', () => ({ useImpactStoryPreview: vi.fn() }));
vi.mock('../lib/content-hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  // No uploads: the link preview uses the card shipped with the build.
  useSiteImages: () => ({ data: undefined }),
}));
vi.mock('react-intersection-observer', () => ({
  useInView: () => ({ ref: vi.fn(), inView: true }),
}));

const draft: PublicImpactStory = {
  id: 'story-1',
  title: 'Girls in code',
  slug: 'girls-in-code',
  excerpt: 'How forty girls in Tamale wrote their first programs.',
  blocks: [{ id: 'text', type: 'rich-text', data: { markdown: 'Still being written.' } }],
  tags: [],
  publishedAt: '2026-09-03T12:00:00.000Z',
  updatedAt: '2026-09-03T12:00:00.000Z',
};

type Result = ReturnType<typeof useImpactStoryPreview>;

const mockPreview = (result: Partial<Result>): void => {
  vi.mocked(useImpactStoryPreview).mockReturnValue({
    data: undefined,
    isPending: false,
    isError: false,
    ...result,
  } as unknown as Result);
};

const Address = (): JSX.Element => {
  const location = useLocation();
  return <output data-testid="address">{`${location.pathname}${location.hash}`}</output>;
};

const renderPage = (entry: string): void => {
  render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route
            path="/impact/stories/preview"
            element={
              <>
                <ImpactStoryPreview />
                <Address />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>,
  );
};

afterEach(() => {
  vi.clearAllMocks();
  window.sessionStorage.clear();
  document.head.querySelector('meta[name="robots"]')?.remove();
});

describe('ImpactStoryPreview', () => {
  it('reads the token from the fragment, then takes it out of the address', async () => {
    mockPreview({ data: draft });
    renderPage('/impact/stories/preview#signed.preview.token');

    expect(useImpactStoryPreview).toHaveBeenCalledWith('signed.preview.token');
    expect(screen.getByRole('note')).toHaveTextContent(/^Preview\./);
    expect(screen.getByText('Still being written.')).toBeInTheDocument();
    // A preview is never shared onwards.
    expect(screen.queryByRole('link', { name: 'Share on LinkedIn' })).not.toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByTestId('address')).toHaveTextContent(/^\/impact\/stories\/preview$/),
    );
    expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe(
      'noindex, nofollow',
    );
  });

  it('explains an expired or wrong link', () => {
    mockPreview({ isError: true, error: new ApiError(404, 'NOT_FOUND', 'Preview not found') });
    renderPage('/impact/stories/preview#expired.token');

    expect(
      screen.getByRole('heading', { name: 'This preview link has expired' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Preview links work for two hours/)).toBeInTheDocument();
  });

  it('does not call a link expired when the server could not be reached', () => {
    const refetch = vi.fn();
    mockPreview({ isError: true, error: new Error('Failed to fetch'), refetch });
    renderPage('/impact/stories/preview#still.valid.token');

    expect(
      screen.getByRole('heading', { name: 'This preview could not be loaded' }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/has expired/)).not.toBeInTheDocument();
    screen.getByRole('button', { name: 'Try again' }).click();
    expect(refetch).toHaveBeenCalled();
  });

  it('says where previews come from when there is no token', () => {
    mockPreview({});
    renderPage('/impact/stories/preview');

    expect(useImpactStoryPreview).toHaveBeenCalledWith('');
    expect(screen.getByText(/Previews open from the admin console/)).toBeInTheDocument();
  });
});
