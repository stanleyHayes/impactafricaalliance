import type { MediaAsset } from '@iaa/shared';
import { ThemeProvider } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  waitForElementToBeRemoved,
  within,
} from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { uploadToCloudinary } from '../../lib/cloudinary';
import { theme } from '../../theme/theme';

import { BlockEditor } from './BlockEditor';
import type { StoryBlockDraft } from './story-form';

vi.mock('../../lib/cloudinary', () => ({ uploadToCloudinary: vi.fn() }));
vi.mock('../../lib/downscale-image', () => ({ downscaleImage: async (file: File) => file }));

afterEach(cleanup);

const Harness = ({
  initial,
  showErrors = false,
}: {
  initial: StoryBlockDraft[];
  showErrors?: boolean;
}): JSX.Element => {
  const [blocks, setBlocks] = useState(initial);
  return (
    <>
      <BlockEditor blocks={blocks} onChange={setBlocks} showErrors={showErrors} />
      <output data-testid="order">{blocks.map((block) => block.id).join(',')}</output>
      <output data-testid="blocks">{JSON.stringify(blocks)}</output>
    </>
  );
};

const mount = (initial: StoryBlockDraft[], showErrors = false): void => {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ThemeProvider theme={theme}>
        <Harness initial={initial} showErrors={showErrors} />
      </ThemeProvider>
    </QueryClientProvider>,
  );
};

const quote = (id: string, text: string): StoryBlockDraft => ({
  id,
  type: 'quote',
  data: { text },
});

const order = (): string => screen.getByTestId('order').textContent ?? '';

describe('BlockEditor', () => {
  it('adds a block of the chosen type from the menu', () => {
    mount([]);
    expect(screen.getByText(/No blocks yet/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Add block' }));
    fireEvent.click(screen.getByRole('menuitem', { name: /Quote/ }));

    const block = screen.getByRole('region', { name: 'Block 1 (Quote)' });
    expect(within(block).getByRole('textbox', { name: /Quote/ })).toBeInTheDocument();
    expect(order()).toMatch(/^quote-[0-9a-f]+$/);
  });

  it('reorders blocks with the move buttons and duplicates one', () => {
    mount([quote('first', 'First words'), quote('second', 'Second words')]);

    fireEvent.click(screen.getByRole('button', { name: 'Move Block 1 (Quote) down' }));
    expect(order()).toBe('second,first');
    expect(screen.getByRole('button', { name: 'Move Block 1 (Quote) up' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Move Block 2 (Quote) up' }));
    expect(order()).toBe('first,second');

    fireEvent.click(screen.getByRole('button', { name: 'Duplicate Block 1 (Quote)' }));
    const ids = order().split(',');
    expect(ids).toHaveLength(3);
    expect(ids[0]).toBe('first');
    expect(ids[1]).not.toBe('first');
    expect(screen.getAllByDisplayValue('First words')).toHaveLength(2);
  });

  it('asks before removing a block, naming it', async () => {
    mount([quote('first', 'First words'), quote('second', 'Second words')]);

    fireEvent.click(screen.getByRole('button', { name: 'Remove Block 2 (Quote)' }));
    const dialog = screen.getByRole('dialog', { name: 'Remove this block?' });
    expect(within(dialog).getByText('Block 2 (Quote)')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitForElementToBeRemoved(() => screen.queryByRole('dialog'));
    expect(order()).toBe('first,second');

    fireEvent.click(screen.getByRole('button', { name: 'Remove Block 2 (Quote)' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    expect(order()).toBe('first');
  });

  it('keeps edits made to other blocks while an upload was running', async () => {
    let finish: (asset: MediaAsset) => void = () => undefined;
    vi.mocked(uploadToCloudinary).mockReturnValue(
      new Promise<MediaAsset>((resolve) => {
        finish = resolve;
      }),
    );
    mount([{ id: 'photo', type: 'image', data: {} }, quote('said', 'First words')]);

    const photo = screen.getByRole('region', { name: 'Block 1 (Image)' });
    const input = photo.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [new File(['x'], 'club.jpg', { type: 'image/jpeg' })] },
    });
    await waitFor(() => expect(uploadToCloudinary).toHaveBeenCalled());

    // Typed while the photo is still uploading.
    fireEvent.change(screen.getByRole('textbox', { name: /Quote/ }), {
      target: { value: 'Words typed meanwhile' },
    });
    await act(async () => {
      finish({ url: 'https://res.cloudinary.com/iaa/image/upload/club.jpg', publicId: 'iaa/club' });
    });

    const saved = JSON.parse(screen.getByTestId('blocks').textContent ?? '[]') as StoryBlockDraft[];
    expect(saved[0]?.data).toMatchObject({ image: { publicId: 'iaa/club' } });
    expect(saved[1]?.data).toMatchObject({ text: 'Words typed meanwhile' });
  });

  it('checks a video link as it is typed and embeds a playable one', () => {
    mount([{ id: 'clip', type: 'video', data: { url: '' } }]);
    const link = screen.getByRole('textbox', { name: /Video link/ });

    fireEvent.change(link, { target: { value: 'https://evil.example/clip' } });
    expect(screen.getByText('Use a YouTube or Vimeo link.')).toBeInTheDocument();
    expect(screen.queryByTitle('Video preview')).not.toBeInTheDocument();

    fireEvent.change(link, { target: { value: 'https://youtu.be/dQw4w9WgXcQ' } });
    expect(screen.getByTitle('Video preview')).toHaveAttribute(
      'src',
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    );
  });

  it('refuses a button link that is not https or a page on the site', () => {
    mount([{ id: 'act', type: 'cta', data: { heading: 'Join us', label: 'Volunteer', url: '' } }]);
    fireEvent.change(screen.getByRole('textbox', { name: /Button link/ }), {
      target: { value: 'javascript:alert(1)' },
    });
    expect(screen.getByText(/Use a link starting with https:\/\//)).toBeInTheDocument();
  });

  it('lists each unfinished block’s problems once errors are shown', () => {
    mount(
      [
        { id: 'numbers', type: 'metrics', data: { items: [{ label: '', value: 40 }] } },
        quote('fine', 'It changed my year.'),
      ],
      true,
    );
    const metrics = screen.getByRole('region', { name: 'Block 1 (Numbers)' });
    expect(within(metrics).getByText('Finish this block before you continue:')).toBeInTheDocument();
    expect(within(metrics).getAllByText('Number 1 · Label is required').length).toBeGreaterThan(0);
    const fine = screen.getByRole('region', { name: 'Block 2 (Quote)' });
    expect(
      within(fine).queryByText('Finish this block before you continue:'),
    ).not.toBeInTheDocument();
  });
});
