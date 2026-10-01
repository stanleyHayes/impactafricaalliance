import type { MediaItem } from '@iaa/shared';
import { ThemeProvider } from '@mui/material/styles';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';

import { useMediaLibrary } from '../../lib/media-library';
import type { FieldConfig } from '../../resources/types';
import { theme } from '../../theme/theme';

import { FieldRenderer } from './FieldRenderer';

vi.mock('../../lib/media-library', () => ({
  // Closed, the picker does not ask for the library at all.
  useMediaLibrary: vi.fn(() => ({ data: undefined, isLoading: false, isError: false })),
}));

const field: FieldConfig = {
  name: 'imageUrl',
  label: 'Picture (optional)',
  type: 'imageUrl',
  helperText: 'Shown over the drawn illustration.',
};

/** The form around one field, reporting its value on every change. */
const Harness = ({
  initial,
  onValue,
}: {
  initial: string;
  onValue: (value: unknown) => void;
}): JSX.Element => {
  const { control, watch } = useForm<Record<string, unknown>>({
    defaultValues: { imageUrl: initial },
  });
  onValue(watch('imageUrl'));
  return <FieldRenderer field={field} control={control} />;
};

const renderField = (initial: string): ReturnType<typeof vi.fn> => {
  const onValue = vi.fn();
  render(
    <ThemeProvider theme={theme}>
      <Harness initial={initial} onValue={onValue} />
    </ThemeProvider>,
  );
  return onValue;
};

describe('a picture stored as its address', () => {
  it('shows the saved picture and its guidance, and saves an empty address when removed', () => {
    const onValue = renderField('https://example.org/popup.jpg');
    expect(screen.getByRole('img', { name: 'Picture (optional)' })).toHaveAttribute(
      'src',
      'https://example.org/popup.jpg',
    );
    expect(screen.getByText('Shown over the drawn illustration.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Remove file' }));
    expect(onValue).toHaveBeenLastCalledWith('');
  });

  it('saves the address of a picture chosen from the media library', async () => {
    vi.mocked(useMediaLibrary).mockReturnValue({
      data: {
        items: [
          {
            id: 'm1',
            url: 'https://res.cloudinary.com/demo/image/upload/v1/site/popup.jpg',
            publicId: 'site/popup',
            filename: 'popup.jpg',
            folder: 'site',
            tags: [],
          } as unknown as MediaItem,
        ],
      },
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useMediaLibrary>);
    const onValue = renderField('');
    fireEvent.click(screen.getByRole('button', { name: 'Choose from library' }));
    fireEvent.click(screen.getByRole('button', { name: /popup\.jpg/ }));
    await waitFor(() =>
      expect(onValue).toHaveBeenLastCalledWith(
        'https://res.cloudinary.com/demo/image/upload/v1/site/popup.jpg',
      ),
    );
  });
});

/** A form whose defaults are a stored record, as on an edit page. */
const EditHarness = ({
  field: config,
  stored,
  onValue,
}: {
  field: FieldConfig;
  stored: unknown;
  onValue: (value: unknown) => void;
}): JSX.Element => {
  const { control, watch } = useForm<Record<string, unknown>>({
    defaultValues: { [config.name]: stored },
  });
  onValue(watch(config.name));
  return <FieldRenderer field={config} control={control} />;
};

const renderEdit = (config: FieldConfig, stored: unknown): ReturnType<typeof vi.fn> => {
  const onValue = vi.fn();
  render(
    <ThemeProvider theme={theme}>
      <EditHarness field={config} stored={stored} onValue={onValue} />
    </ThemeProvider>,
  );
  return onValue;
};

// react-hook-form shows a field's default in place of undefined, and on an
// edit page the default is the stored value: an emptied field is null.
describe('emptying a field on an edit page', () => {
  it('removes a stored picture from view and holds null', () => {
    const photo = { url: 'https://example.org/ama.jpg', publicId: 'ama' };
    const onValue = renderEdit({ name: 'photo', label: 'Photo', type: 'image' }, photo);
    expect(screen.getByRole('img', { name: 'Photo' })).toHaveAttribute('src', photo.url);
    fireEvent.click(screen.getByRole('button', { name: 'Remove file' }));
    expect(screen.queryByRole('img', { name: 'Photo' })).not.toBeInTheDocument();
    expect(onValue).toHaveBeenLastCalledWith(null);
  });

  it('keeps an emptied number empty and holds null', () => {
    const onValue = renderEdit({ name: 'order', label: 'Order', type: 'number' }, 4);
    const input = screen.getByRole('spinbutton', { name: 'Order' });
    fireEvent.change(input, { target: { value: '' } });
    expect(input).toHaveValue(null);
    expect(onValue).toHaveBeenLastCalledWith(null);
  });
});
