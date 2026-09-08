import type { TeamMember } from '@iaa/shared';
import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { IMAGES } from '../content/images';
import { ApiError } from '../lib/api-client';
import { useTeamMember } from '../lib/content-hooks';
import { renderWithProviders } from '../test/test-utils';

import TeamProfile from './TeamProfile';

vi.mock('../lib/content-hooks', () => ({
  useTeamMember: vi.fn(),
  useSiteImages: () => ({ data: { items: [] } }),
  // No settings loaded, so the defaults decide which personal links show.
  useSiteSettings: () => ({ data: undefined }),
}));
vi.mock('../components/SectionReveal', () => ({
  SectionReveal: ({ children }: { children: React.ReactNode }) => children,
}));

const member: TeamMember = {
  id: 'test-member',
  name: 'Ama Mensah',
  role: 'Country Director, Ghana',
  tier: 'executive',
  bio: 'A biography opening.\n\nA second paragraph with more detail.',
  photo: { url: 'https://example.com/portrait.jpg', publicId: 'test-portrait', alt: 'Ama' },
  linkedInUrl: 'https://linkedin.com/in/ama',
  websiteUrl: 'javascript:alert(1)',
  isActive: true,
  order: 0,
  createdAt: '',
  updatedAt: '',
};

const query = (values: Record<string, unknown>) => {
  vi.mocked(useTeamMember).mockReturnValue({
    data: undefined,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    ...values,
  } as unknown as ReturnType<typeof useTeamMember>);
};

describe('TeamProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the full biography and safe social links, with a return link to the team', () => {
    query({ data: member });
    renderWithProviders(<TeamProfile />);
    expect(screen.getByRole('heading', { name: member.name, level: 1 })).toBeInTheDocument();
    expect(screen.getByText('A second paragraph with more detail.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'LinkedIn' })).toHaveAttribute(
      'href',
      member.linkedInUrl,
    );
    expect(screen.queryByRole('link', { name: 'Website' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Meet the team' })).toHaveAttribute(
      'href',
      '/about#team',
    );
    const portrait = screen.getByRole('img', { name: member.name });
    fireEvent.error(portrait);
    expect(portrait).toHaveAttribute('src', IMAGES.teamArtwork);
  });

  it('uses the existing artwork and a clear message when no portrait or bio is provided', () => {
    query({ data: { ...member, photo: undefined, bio: undefined } });
    const { container } = renderWithProviders(<TeamProfile />);
    expect(container.querySelector('img')).toHaveAttribute('src', IMAGES.teamArtwork);
    expect(screen.getByText(/Their full biography will be shared here soon/)).toBeInTheDocument();
  });

  it('distinguishes an unpublished or missing profile from a retryable loading error', () => {
    query({ error: new ApiError(404, 'NOT_FOUND', 'Not found') });
    const { unmount } = renderWithProviders(<TeamProfile />);
    expect(screen.getByRole('heading', { name: 'Profile unavailable.' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
    unmount();
    const refetch = vi.fn();
    query({ error: new Error('Network unavailable'), refetch });
    renderWithProviders(<TeamProfile />);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(refetch).toHaveBeenCalledOnce();
  });

  it('shows a skeleton until the profile arrives', () => {
    query({ isLoading: true });
    renderWithProviders(<TeamProfile />);
    expect(screen.getByRole('status', { name: 'Loading page' })).toBeInTheDocument();
    expect(screen.queryByText('Profile unavailable.')).not.toBeInTheDocument();
  });
});
