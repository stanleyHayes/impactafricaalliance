import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { App } from './App';

// The table is what is under test, not the pages or the site chrome, so both
// are replaced with markers. Real pages fetch data and would need the API.
const { stubPage } = vi.hoisted(() => ({
  stubPage: (name: string) => async () => {
    const { createElement } = await import('react');
    return { default: () => createElement('h1', null, name) };
  },
}));

vi.mock('../components/layout/Layout', async () => {
  const { createElement } = await import('react');
  const { Outlet } = await import('react-router-dom');
  return {
    Layout: () => createElement('div', { 'data-testid': 'site-layout' }, createElement(Outlet)),
  };
});
vi.mock('../pages/ImpactStories', stubPage('impact stories page'));
vi.mock('../pages/ImpactStory', stubPage('impact story page'));
vi.mock('../pages/ImpactStoryPreview', stubPage('impact story preview page'));
vi.mock('../pages/Apply', stubPage('apply page'));
vi.mock('../pages/ApplyPreview', stubPage('apply preview page'));
vi.mock('../pages/NotFound', stubPage('not found page'));

const renderAt = (path: string): void => {
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
};

describe('marketing route table', () => {
  it.each([
    ['/impact/stories', 'impact stories page'],
    ['/impact/stories/preview', 'impact story preview page'],
    ['/impact/stories/clean-water-in-tamale', 'impact story page'],
  ])('shows %s inside the site layout', async (path, page) => {
    renderAt(path);

    const heading = await screen.findByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent(page);
    expect(within(screen.getByTestId('site-layout')).getByRole('heading')).toBe(heading);
  });

  it.each([
    ['/apply/preview', 'apply preview page'],
    ['/apply/speaker-applications-2027', 'apply page'],
  ])('shows %s without the site layout', async (path, page) => {
    renderAt(path);

    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(page);
    expect(screen.queryByTestId('site-layout')).not.toBeInTheDocument();
  });

  it('shows the full-screen application skeleton while the applicant flow loads', async () => {
    // A lazy page stays loaded once an earlier test has shown it, so load a
    // fresh route table to see the fallback again whatever order tests run in.
    vi.resetModules();
    const { App: FreshApp } = await import('./App');
    render(
      <MemoryRouter initialEntries={['/apply/speaker-applications-2027']}>
        <FreshApp />
      </MemoryRouter>,
    );

    expect(screen.getByRole('status', { name: 'Loading application' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('apply page');
  });

  it('still sends an unknown path under /apply to the not-found page', async () => {
    renderAt('/apply/speakers/extra');

    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('not found page');
    expect(screen.getByTestId('site-layout')).toBeInTheDocument();
  });
});
