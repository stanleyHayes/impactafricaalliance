import type { MediaAsset, StoryBlock } from '@iaa/shared';
import { fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '../../../test/test-utils';
import { galleryTileSpans } from '../story-utils';
import { StoryBlocks } from '../StoryBlocks';

import { HeroBlock } from './HeroBlock';

vi.mock('react-intersection-observer', () => ({
  useInView: () => ({ ref: vi.fn(), inView: true }),
}));

const photo = (name: string, alt = `Photo ${name}`): MediaAsset => ({
  url: `https://res.cloudinary.com/iaa/image/upload/v1/stories/${name}.jpg`,
  publicId: `iaa/stories/${name}`,
  width: 1600,
  height: 1067,
  alt,
});

const render = (blocks: StoryBlock[]): ReturnType<typeof renderWithProviders> =>
  renderWithProviders(<StoryBlocks blocks={blocks} />);

describe('story block renderers', () => {
  it('draws every block type', () => {
    render([
      { id: 'h', type: 'hero', data: { heading: 'A chapter begins', image: photo('hero') } },
      { id: 't', type: 'rich-text', data: { markdown: 'It began with a **borrowed** laptop.' } },
      { id: 'i', type: 'image', data: { image: photo('single'), caption: 'Club day in Tamale' } },
      {
        id: 'g',
        type: 'gallery',
        data: {
          heading: 'The year in pictures',
          images: [{ image: photo('a') }, { image: photo('b') }],
        },
      },
      { id: 'v', type: 'video', data: { url: 'https://youtu.be/dQw4w9WgXcQ' } },
      {
        id: 'q',
        type: 'quote',
        data: { text: 'It changed my year.', attribution: 'Amina', role: 'Club member' },
      },
      {
        id: 'm',
        type: 'metrics',
        data: {
          heading: 'Results so far',
          items: [{ label: 'Girls taught', value: 40, suffix: '+' }],
        },
      },
      {
        id: 'tl',
        type: 'timeline',
        data: { items: [{ label: 'March 2026', title: 'First class' }] },
      },
      { id: 'p', type: 'partners', data: { items: [{ name: 'Tamale Tech Hub' }] } },
      {
        id: 'c',
        type: 'cta',
        data: { heading: 'Join us', label: 'Volunteer', url: '/get-involved' },
      },
    ]);

    expect(screen.getByRole('heading', { level: 2, name: 'A chapter begins' })).toBeInTheDocument();
    expect(screen.getByText('borrowed')).toBeInTheDocument();
    expect(screen.getByText('Club day in Tamale')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'The year in pictures' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Play video/ })).toBeInTheDocument();
    expect(screen.getByText('It changed my year.')).toBeInTheDocument();
    expect(screen.getByText('Girls taught')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'First class' })).toBeInTheDocument();
    expect(screen.getByText('Tamale Tech Hub')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Join us' })).toBeInTheDocument();
  });

  it('serves pictures at the width the layout needs, lazily and without layout shift', () => {
    render([{ id: 'i', type: 'image', data: { image: photo('single', 'Girls at a laptop') } }]);
    const image = screen.getByRole('img', { name: 'Girls at a laptop' });
    expect(image).toHaveAttribute('loading', 'lazy');
    expect(image).toHaveAttribute('width', '1600');
    expect(image).toHaveAttribute('height', '1067');
    expect(image.getAttribute('srcset')).toContain('w_480');
    expect(image.getAttribute('src')).toContain('f_auto,q_auto');
  });

  it('loads nothing from the video host until the visitor presses play', () => {
    render([
      {
        id: 'v',
        type: 'video',
        data: { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', caption: 'Graduation day' },
      },
    ]);
    expect(document.querySelector('iframe')).toBeNull();

    fireEvent.click(
      screen.getByRole('button', { name: 'Play video: Graduation day (loads from YouTube)' }),
    );

    const frame = screen.getByTitle('Video: Graduation day');
    expect(frame.tagName).toBe('IFRAME');
    expect(frame).toHaveAttribute(
      'src',
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1',
    );
  });

  it('draws nothing for a video link it cannot embed', () => {
    render([{ id: 'v', type: 'video', data: { url: 'https://evil.example/clip' } }]);
    expect(screen.queryByRole('button', { name: /Play video/ })).not.toBeInTheDocument();
  });

  it('keeps call-to-action links on this site in place and sends others to a new tab safely', () => {
    render([
      {
        id: 'in',
        type: 'cta',
        data: { heading: 'Volunteer', label: 'Get involved', url: '/get-involved' },
      },
      {
        id: 'out',
        type: 'cta',
        data: { heading: 'Donate', label: 'Give now', url: 'https://give.example/iaa' },
      },
      {
        id: 'bad',
        type: 'cta',
        data: { heading: 'Broken', label: 'Do not follow', url: 'javascript:alert(1)' },
      },
    ]);
    const internal = screen.getByRole('link', { name: 'Get involved' });
    expect(internal).toHaveAttribute('href', '/get-involved');
    expect(internal).not.toHaveAttribute('target');

    const external = screen.getByRole('link', { name: 'Give now' });
    expect(external).toHaveAttribute('href', 'https://give.example/iaa');
    expect(external).toHaveAttribute('target', '_blank');
    expect(external).toHaveAttribute('rel', 'noopener noreferrer');

    expect(screen.queryByRole('link', { name: 'Do not follow' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Broken' })).toBeInTheDocument();
  });

  it('names each partner logo after the partner', () => {
    render([
      {
        id: 'p',
        type: 'partners',
        data: {
          heading: 'Our partners',
          items: [
            {
              name: 'Tamale Tech Hub',
              logo: photo('logo', 'logo.png'),
              url: 'https://tamaletech.example',
            },
          ],
        },
      },
    ]);
    const list = screen.getByRole('list');
    expect(within(list).getByRole('img', { name: 'Tamale Tech Hub' })).toBeInTheDocument();
    expect(within(list).getByRole('link', { name: 'Tamale Tech Hub' })).toHaveAttribute(
      'rel',
      'noopener noreferrer',
    );
  });

  it.each(Array.from({ length: 12 }, (_, index) => index + 1))(
    'fills every gallery row of %i photos, leaving no empty cells',
    (count) => {
      const spans = galleryTileSpans(count);
      expect(spans).toHaveLength(count);
      // Walk the tiles into rows as the grid would, and check each row is full.
      const rows = (tracks: number, key: 'md' | 'sm'): number[] =>
        spans.reduce<number[]>((sums, span) => {
          const last = sums.length - 1;
          const current = sums[last] ?? tracks;
          if (current + span[key] > tracks) return [...sums, span[key]];
          return [...sums.slice(0, last), current + span[key]];
        }, []);
      expect(rows(6, 'md').every((sum) => sum === 6)).toBe(true);
      expect(rows(2, 'sm').every((sum) => sum === 2)).toBe(true);
      // The first photo leads wider than the rest once it has a partner.
      if (count > 1) expect(spans[0]).toEqual({ md: 4, sm: 2 });
    },
  );

  it('gives a leading hero the page heading', () => {
    renderWithProviders(
      <HeroBlock lead data={{ heading: 'Girls in code', eyebrow: 'Digital skills' }} />,
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Girls in code' })).toBeInTheDocument();
  });
});
