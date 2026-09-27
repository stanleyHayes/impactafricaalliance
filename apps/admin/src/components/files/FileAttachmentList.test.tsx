import type { FileAttachment } from '@iaa/shared';
import { ThemeProvider } from '@mui/material/styles';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { uploadToCloudinary } from '../../lib/cloudinary';
import { theme } from '../../theme/theme';

import { FileAttachmentList, type FileAttachmentListProps } from './FileAttachmentList';

const { auth } = vi.hoisted(() => ({
  auth: { user: { role: 'editor', permissions: ['tasks:update', 'media:create'] as string[] } },
}));

vi.mock('../../auth/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('../../lib/cloudinary', () => ({
  uploadToCloudinary: vi.fn(),
  DOCUMENT_ACCEPT: '.pdf,.docx',
  DOCUMENT_MAX_BYTES: 10 * 1024 * 1024,
}));

const budget: FileAttachment = {
  id: 'doc-1',
  name: 'Budget 2026.xlsx',
  file: {
    url: 'https://res.cloudinary.com/demo/raw/upload/iaa/budget.xlsx',
    publicId: 'iaa/budget.xlsx',
    format: 'xlsx',
    bytes: 48_000,
  },
  addedBy: { id: 'u1', name: 'Ama Mensah', email: 'ama@example.org', role: 'editor' },
  addedAt: '2026-09-20T10:00:00.000Z',
};

const onAdd = vi.fn();
const onRemove = vi.fn();
const onUploadingChange = vi.fn();

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  auth.user.permissions = ['tasks:update', 'media:create'];
});

const setup = (props: Partial<FileAttachmentListProps> = {}): void => {
  render(
    <ThemeProvider theme={theme}>
      <FileAttachmentList
        items={[budget]}
        canEdit
        onAdd={onAdd}
        onRemove={onRemove}
        onUploadingChange={onUploadingChange}
        {...props}
      />
    </ThemeProvider>,
  );
};

describe('FileAttachmentList', () => {
  it('lists each document with its type, size and who added it', () => {
    setup();
    expect(screen.getByRole('link', { name: 'Budget 2026.xlsx' })).toHaveAttribute(
      'href',
      budget.file.url,
    );
    // ICU spells September "Sep" or "Sept" depending on its version.
    expect(
      screen.getByText(/XLSX · 47 KB · Added by Ama Mensah on 20 Sept? 2026/),
    ).toBeInTheDocument();
  });

  it('uploads a document without adding it to the media library, then saves it', async () => {
    const asset = { ...budget.file, publicId: 'iaa/minutes.pdf', format: 'pdf' };
    vi.mocked(uploadToCloudinary).mockResolvedValue(asset);
    onAdd.mockResolvedValue(undefined);
    setup();

    const file = new File(['minutes'], 'Board minutes.pdf', { type: 'application/pdf' });
    fireEvent.change(screen.getByTestId('file-upload-input'), { target: { files: [file] } });

    await waitFor(() =>
      expect(onAdd).toHaveBeenCalledWith({ name: 'Board minutes.pdf', file: asset }),
    );
    expect(uploadToCloudinary).toHaveBeenCalledWith(file, 'documents', {
      register: false,
      profile: 'document',
    });
    expect(onUploadingChange.mock.calls).toEqual([[true], [false]]);
  });

  it('shows why an upload failed', async () => {
    vi.mocked(uploadToCloudinary).mockRejectedValue(
      new Error('File is too large. Maximum size is 10 MB.'),
    );
    setup();
    const file = new File(['x'], 'huge.pdf', { type: 'application/pdf' });
    fireEvent.change(screen.getByTestId('file-upload-input'), { target: { files: [file] } });
    expect(await screen.findByRole('alert')).toHaveTextContent('Maximum size is 10 MB');
    expect(onAdd).not.toHaveBeenCalled();
  });

  it('asks before removing, naming the document', async () => {
    onRemove.mockResolvedValue(undefined);
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Remove Budget 2026.xlsx' }));
    const dialog = screen.getByRole('dialog', { name: 'Remove this document?' });
    expect(dialog).toHaveTextContent('Budget 2026.xlsx will be taken off this list.');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Remove' }));
    await waitFor(() => expect(onRemove).toHaveBeenCalledWith('doc-1'));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('is read-only without permission to edit', () => {
    setup({ canEdit: false });
    expect(screen.queryByRole('button', { name: /Remove/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Upload document' })).not.toBeInTheDocument();
  });

  it('says who can help when this person may edit the record but not upload', () => {
    // Signing an upload needs media:create; a custom grant can leave it out.
    auth.user.permissions = ['tasks:update'];
    setup();
    expect(screen.getByRole('button', { name: 'Upload document' })).toBeDisabled();
    expect(
      screen.getByText(
        'Uploading files needs Media library access. An administrator can grant it under Users.',
      ),
    ).toBeInTheDocument();
    // Removing is part of editing the record, so it stays.
    expect(screen.getByRole('button', { name: 'Remove Budget 2026.xlsx' })).toBeEnabled();
  });

  it('offers uploads to someone with media access, without the note', () => {
    setup();
    expect(screen.getByRole('button', { name: 'Upload document' })).toBeEnabled();
    expect(screen.queryByText(/needs Media library access/)).not.toBeInTheDocument();
  });

  it('stops offering uploads at the limit', () => {
    setup({ max: 1 });
    expect(screen.getByRole('button', { name: 'Upload document' })).toBeDisabled();
    expect(screen.getByText(/Remove one to add another/)).toBeInTheDocument();
  });
});
