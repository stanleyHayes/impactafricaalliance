import type { Paginated, TeamMember } from '@iaa/shared';
import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useTeam } from '../lib/content-hooks';
import { renderWithProviders } from '../test/test-utils';

import { TeamSection } from './About';

vi.mock('../lib/content-hooks', () => ({
  useImpactStats: vi.fn(),
  usePageCopy: vi.fn(),
  usePartners: vi.fn(),
  useTeam: vi.fn(),
}));

vi.mock('react-intersection-observer', () => ({
  useInView: () => ({ ref: vi.fn(), inView: true }),
}));

const member = (
  name: string,
  role: string,
  tier: TeamMember['tier'],
  order: number,
): TeamMember => ({
  id: name.toLowerCase().replace(/\W+/g, '-'),
  name,
  role,
  tier,
  bio: `${name} opening line.\n\nA second paragraph nobody should see on a card.`,
  order,
  isActive: true,
  createdAt: '2026-09-08T00:00:00.000Z',
  updatedAt: '2026-09-08T00:00:00.000Z',
});

const TEAM: TeamMember[] = [
  member('Emmanuel Mbansi', 'President / CEO', 'executive', 1),
  member('Joshua Opoku Agyemang', 'Vice President / COO', 'executive', 2),
  member('Jemimah Opata', 'Country Director, Ghana', 'executive', 3),
  member('Rahmah Mohammed', 'Country Director, Nigeria', 'executive', 4),
  member('Stanley Hayford', 'Technology Lead', 'executive', 5),
  member('Aïché Goumané', 'Country Director, Mali', 'non-executive', 33),
];

const renderTeam = (items: TeamMember[] = TEAM): void => {
  const data: Paginated<TeamMember> = {
    items,
    page: 1,
    pageSize: 50,
    total: items.length,
    totalPages: 1,
  };
  vi.mocked(useTeam).mockReturnValue({
    data,
    isLoading: false,
    isError: false,
  } as ReturnType<typeof useTeam>);
  renderWithProviders(<TeamSection />);
};

describe('the team section', () => {
  it('names the two groups the way the organisation does', () => {
    renderTeam();

    expect(screen.getByText('Functional Directors')).toBeInTheDocument();
    expect(screen.getByText('Country & Regional Teams')).toBeInTheDocument();
    expect(screen.queryByText('Executive Team')).not.toBeInTheDocument();
    expect(screen.queryByText('Non-Executive Team')).not.toBeInTheDocument();
  });

  it('places the leadership in rank order, most senior first', () => {
    renderTeam();

    const names = screen.getAllByRole('heading', { level: 3 }).map((node) => node.textContent);
    expect(names).toEqual([
      'Emmanuel Mbansi',
      'Joshua Opoku Agyemang',
      'Jemimah Opata',
      'Rahmah Mohammed',
      'Stanley Hayford',
      'Aïché Goumané',
    ]);
  });

  it('gives the principals a fuller card than the people below them', () => {
    renderTeam();

    const cardFor = (name: string): HTMLElement =>
      screen.getByRole('heading', { level: 3, name }).closest('article') as HTMLElement;

    // The president and vice-president carry the opening line of their bio;
    // everyone else is a portrait, a name and a role.
    expect(within(cardFor('Emmanuel Mbansi')).getByText(/opening line/)).toBeInTheDocument();
    expect(
      within(cardFor('Joshua Opoku Agyemang')).getByText(/opening line/),
    ).toBeInTheDocument();
    expect(within(cardFor('Jemimah Opata')).queryByText(/opening line/)).not.toBeInTheDocument();
    expect(within(cardFor('Stanley Hayford')).queryByText(/opening line/)).not.toBeInTheDocument();
  });

  it('never shows more than the opening paragraph on a card', () => {
    renderTeam();

    expect(screen.queryByText(/second paragraph/)).not.toBeInTheDocument();
  });

  it('draws no chain of command over the country teams, who are peers', () => {
    renderTeam([TEAM[5] as TeamMember]);

    // A lone country director is not a president: no wide card, so no bio line.
    expect(screen.getByRole('heading', { level: 3, name: 'Aïché Goumané' })).toBeInTheDocument();
    expect(screen.queryByText(/opening line/)).not.toBeInTheDocument();
  });
});
