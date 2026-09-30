import { ThemeProvider } from '@mui/material/styles';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { RESOURCES } from '../../resources/registry';
import type { ResourceConfig, ResourceRow } from '../../resources/types';
import { theme } from '../../theme/theme';

import { ResourceCard } from './ResourceCard';

const popups = RESOURCES.find((resource) => resource.key === 'popups') as ResourceConfig;

const popup = (imageUrl?: string | null): ResourceRow => ({
  id: 'popup-1',
  name: 'Launch',
  title: 'We are live',
  message: 'Come and see.',
  imageUrl,
  isActive: true,
  priority: 0,
});

const renderCard = (row: ResourceRow): HTMLElement =>
  render(
    <ThemeProvider theme={theme}>
      <ResourceCard
        resource={popups}
        row={row}
        canEdit
        onView={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    </ThemeProvider>,
  ).container;

describe('a popup’s card', () => {
  it('shows its picture, which is stored as a bare address', () => {
    const picture = 'https://res.cloudinary.com/demo/image/upload/v1/popup.jpg';
    expect(renderCard(popup(picture)).querySelector('img')?.getAttribute('src')).toBe(picture);
  });

  it('shows the resource icon once the picture has been removed', () => {
    for (const removed of [null, '', undefined]) {
      expect(renderCard(popup(removed)).querySelector('img')).toBeNull();
    }
  });
});
