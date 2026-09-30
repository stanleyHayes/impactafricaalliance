import { SITE_IMAGE_SLOTS, type MediaItem, type SiteImage } from '@iaa/shared';
import { ThemeProvider } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useMediaLibrary } from '../lib/media-library';
import { useResourceList, useSaveResource } from '../resources/hooks';
import { theme } from '../theme/theme';

import SiteImages from './SiteImages';

const auth = vi.hoisted(() => ({ permissions: [] as string[] }));

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({ user: { permissions: auth.permissions } }),
}));

vi.mock('../resources/hooks', () => ({
  useResourceList: vi.fn(),
  useSaveResource: vi.fn(),
}));

vi.mock('../lib/media-library', () => ({ useMediaLibrary: vi.fn() }));

const EDITOR_OF_IMAGES = [
  'site-images:read',
  'site-images:create',
  'site-images:update',
  'media:create',
  'pillar-images:read',
  'page-settings:read',
];

const UPLOAD = 'https://res.cloudinary.com/demo/image/upload/v1/site/upload.jpg';

const record = (key: string, overrides: Partial<SiteImage> = {}): SiteImage => ({
  id: `id-${key}`,
  key,
  image: { url: UPLOAD, publicId: 'site/upload' },
  alt: 'Volunteers at a workshop',
  isActive: true,
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
  ...overrides,
});

const libraryItem: MediaItem = {
  id: 'media-1',
  url: 'https://res.cloudinary.com/demo/image/upload/v1/site/crowd.jpg',
  publicId: 'site/crowd',
  filename: 'crowd.jpg',
  folder: 'site',
  altText: 'A crowd at the Accra festival',
  tags: [],
  width: 2400,
  height: 1030,
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
} as MediaItem;

let mutate: ReturnType<typeof vi.fn>;

const serve = (items: SiteImage[] | 'loading'): void => {
  vi.mocked(useResourceList).mockImplementation(
    (key: string) =>
      (key === 'site-images' && items === 'loading'
        ? { data: undefined, isLoading: true, isError: false }
        : {
            data: { items: key === 'site-images' ? items : [] },
            isLoading: false,
            isError: false,
          }) as unknown as ReturnType<typeof useResourceList>,
  );
};

const renderPage = (): void => {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ThemeProvider theme={theme}>
        <MemoryRouter>
          <SiteImages />
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>,
  );
};

const card = (label: string): HTMLElement => screen.getByRole('article', { name: label });

/** Choose the library picture, and wait for the picker to close and stop hiding the dialog. */
const chooseFromLibrary = async (dialog: HTMLElement): Promise<HTMLElement> => {
  fireEvent.click(within(dialog).getByRole('button', { name: 'Choose from library' }));
  fireEvent.click(screen.getByRole('button', { name: /crowd\.jpg/ }));
  let save: HTMLElement | undefined;
  await waitFor(() => {
    save = within(dialog).getByRole('button', { name: 'Use this picture' });
    expect(save).toBeEnabled();
  });
  return save as HTMLElement;
};

beforeEach(() => {
  auth.permissions = EDITOR_OF_IMAGES;
  mutate = vi.fn();
  vi.mocked(useSaveResource).mockReturnValue({
    mutate,
    reset: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  } as unknown as ReturnType<typeof useSaveResource>);
  vi.mocked(useMediaLibrary).mockReturnValue({
    data: { items: [libraryItem], page: 1, pageSize: 100, total: 1, totalPages: 1 },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useMediaLibrary>);
});

describe('the site images page', () => {
  it('keeps its real heading on screen while the uploads load', () => {
    serve('loading');
    renderPage();
    expect(screen.getByRole('heading', { name: 'Site images' })).toBeInTheDocument();
    expect(screen.getByLabelText('Loading site images')).toBeInTheDocument();
  });

  it('lists every slot, grouped by page, including the ones still on their default', () => {
    serve([record('about-hero')]);
    renderPage();
    expect(screen.getAllByRole('article')).toHaveLength(SITE_IMAGE_SLOTS.length);
    for (const page of ['Across the site', 'Home', 'About', 'Contact']) {
      expect(screen.getByRole('region', { name: page })).toBeInTheDocument();
    }
    const about = within(screen.getByRole('region', { name: 'About' }));
    expect(about.getByRole('article', { name: 'About — Page banner' })).toHaveTextContent(
      'Replaced',
    );
    expect(within(card('Contact — Page banner')).getByText('Default')).toBeInTheDocument();
    expect(within(card('Contact — Page banner')).getByText(/2000 × 1125 px/)).toBeInTheDocument();
    // A banner that still shares the default says so.
    expect(within(card('News — Page banner')).getByText('Default')).toBeInTheDocument();
  });

  it('replaces a default picture with one from the media library, as a new record', async () => {
    serve([]);
    renderPage();
    fireEvent.click(within(card('About — Who we are')).getByRole('button', { name: 'Replace' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('button', { name: 'Use this picture' })).toBeDisabled();

    const save = await chooseFromLibrary(dialog);
    // The library's description is offered as the alt text.
    expect(within(dialog).getByLabelText('Alt text')).toHaveValue('A crowd at the Accra festival');

    fireEvent.click(save);
    expect(mutate).toHaveBeenCalledWith(
      {
        body: {
          key: 'about-intro',
          image: expect.objectContaining({ url: libraryItem.url, width: 2400 }),
          isActive: true,
          alt: 'A crowd at the Accra festival',
        },
      },
      expect.anything(),
    );
  });

  it('edits the existing record when a replaced picture is replaced again', async () => {
    serve([record('about-hero')]);
    renderPage();
    fireEvent.click(within(card('About — Page banner')).getByRole('button', { name: 'Replace' }));
    const dialog = screen.getByRole('dialog');
    // A banner behind text needs no description, so none is asked for.
    expect(within(dialog).queryByLabelText('Alt text')).not.toBeInTheDocument();
    fireEvent.click(await chooseFromLibrary(dialog));
    expect(mutate).toHaveBeenCalledWith(
      { id: 'id-about-hero', body: expect.objectContaining({ isActive: true }) },
      expect.anything(),
    );
  });

  it('offers a reset replacement again, so bringing it back is one click', () => {
    serve([record('contact-hero', { isActive: false })]);
    renderPage();
    const contact = card('Contact — Page banner');
    expect(within(contact).getByText('Default')).toBeInTheDocument();
    expect(within(contact).getByText(/saved but not shown/)).toBeInTheDocument();
    fireEvent.click(within(contact).getByRole('button', { name: 'Replace' }));
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Use this picture' }),
    );
    expect(mutate).toHaveBeenCalledWith(
      {
        id: 'id-contact-hero',
        body: { image: expect.objectContaining({ url: UPLOAD }), isActive: true },
      },
      expect.anything(),
    );
  });

  it('warns that resetting the default banner resets the banners sharing it', () => {
    serve([record('community')]);
    renderPage();
    fireEvent.click(
      within(card('Default page banner')).getByRole('button', { name: 'Reset to default' }),
    );
    expect(
      screen.getByRole('dialog', { name: 'Reset Default page banner to default?' }),
    ).toHaveTextContent('and so do the banners that share it');
  });

  it('asks before resetting, naming the slot, then switches the upload off', () => {
    serve([record('contact-hero')]);
    renderPage();
    fireEvent.click(
      within(card('Contact — Page banner')).getByRole('button', { name: 'Reset to default' }),
    );
    const confirm = screen.getByRole('dialog', { name: 'Reset Contact — Page banner to default?' });
    expect(confirm).toHaveTextContent('Your upload stays in the media library');
    fireEvent.click(within(confirm).getByRole('button', { name: 'Reset to default' }));
    expect(mutate).toHaveBeenCalledWith(
      { id: 'id-contact-hero', body: { isActive: false } },
      expect.anything(),
    );
  });

  it('offers alt text only for a replaced picture that is read aloud', () => {
    serve([record('about-intro')]);
    renderPage();
    // The original keeps its own description; a background banner has none to edit.
    expect(
      within(card('Home — Hero, first slide')).getByRole('button', { name: 'Edit alt text' }),
    ).toBeDisabled();
    expect(
      within(card('Contact — Page banner')).queryByRole('button', { name: 'Edit alt text' }),
    ).not.toBeInTheDocument();

    fireEvent.click(
      within(card('About — Who we are')).getByRole('button', { name: 'Edit alt text' }),
    );
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Alt text'), { target: { value: '' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    // Emptied, so it clears rather than leaving the old words in place.
    expect(mutate).toHaveBeenCalledWith(
      { id: 'id-about-intro', body: { alt: '' } },
      expect.anything(),
    );
  });

  it('shows everything but offers no changes to someone who may only read', () => {
    auth.permissions = ['site-images:read'];
    serve([record('about-hero')]);
    renderPage();
    expect(screen.getByRole('note')).toHaveTextContent(/administrator can grant under Users/);
    expect(screen.queryByRole('button', { name: 'Replace' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reset to default' })).not.toBeInTheDocument();
  });

  it('points to where the other pictures on the site are edited', () => {
    serve([]);
    renderPage();
    const elsewhere = within(screen.getByRole('region', { name: 'Pictures edited elsewhere' }));
    expect(elsewhere.getByRole('link', { name: 'Pillar Images' })).toHaveAttribute(
      'href',
      '/content/pillar-images',
    );
    // Only the pages this person may open are offered.
    expect(elsewhere.queryByRole('link', { name: 'Team' })).not.toBeInTheDocument();
  });

  it('narrows to what matches a search, and offers a way back when nothing does', () => {
    serve([]);
    renderPage();
    fireEvent.change(screen.getByLabelText('Search site images'), {
      target: { value: 'vision quote' },
    });
    expect(screen.getAllByRole('article')).toHaveLength(1);
    fireEvent.change(screen.getByLabelText('Search site images'), {
      target: { value: 'nothing like this' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(screen.getAllByRole('article')).toHaveLength(SITE_IMAGE_SLOTS.length);
  });

  it('says so when an upload will not load, and shows the default the site falls back to', () => {
    serve([record('about-intro')]);
    renderPage();
    const intro = card('About — Who we are');
    // The card's picture is the first image in it; the upload is broken.
    const picture = intro.querySelector('img') as HTMLImageElement;
    expect(picture.getAttribute('src')).toContain('v1/site/upload.jpg');
    fireEvent.error(picture);
    expect(within(intro).getByText(/could not be loaded/)).toBeInTheDocument();
    expect(picture.getAttribute('src')).toBe(
      'https://www.impactafricaalliance.org/images/community.webp',
    );
  });
});
