import type { SignedApplicationUpload } from '@iaa/shared';
import { act, cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '../../../lib/api-client';
import { createDraft, getPublicForm, signUpload, submitDraft } from '../api';
import {
  DRAFT_TOKEN,
  findScreenHeading,
  makeDraft,
  makeFileForm,
  renderApplyRoute,
  stubStorage,
  withInstantMotion,
} from '../flow-test-utils';

vi.mock('../api');

/** Stands in for the browser's XMLHttpRequest so a test can drive progress and the answer. */
class FakeXhr {
  static instances: FakeXhr[] = [];
  upload: {
    onprogress:
      ((event: { lengthComputable: boolean; loaded: number; total: number }) => void) | null;
  } = { onprogress: null };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onabort: (() => void) | null = null;
  status = 0;
  responseText = '';
  method = '';
  url = '';
  body: FormData | null = null;

  open(method: string, url: string): void {
    this.method = method;
    this.url = url;
  }

  send(body: FormData): void {
    this.body = body;
    FakeXhr.instances.push(this);
  }

  abort(): void {
    this.onabort?.();
  }

  progress(loaded: number, total: number): void {
    act(() => this.upload.onprogress?.({ lengthComputable: true, loaded, total }));
  }

  respond(status: number, body: unknown): void {
    this.status = status;
    this.responseText = JSON.stringify(body);
    act(() => this.onload?.());
  }

  fail(): void {
    act(() => this.onerror?.());
  }
}

const SIGNED: SignedApplicationUpload = {
  uploadUrl: 'https://api.cloudinary.com/v1_1/demo/auto/upload',
  fields: {
    api_key: 'key',
    signature: 'signed',
    timestamp: '1790000000',
    folder: 'iaa/applications/form/draft',
    public_id: 'cv-0123456789abcdef',
    type: 'authenticated',
  },
  publicId: 'iaa/applications/form/draft/cv-0123456789abcdef',
  folder: 'iaa/applications/form/draft',
  maxBytes: 5 * 1024 * 1024,
  allowedFormats: ['pdf'],
};

const CLOUDINARY_RESULT = {
  public_id: 'iaa/applications/form/draft/cv-0123456789abcdef',
  secure_url:
    'https://res.cloudinary.com/demo/image/authenticated/s--abc--/v1/iaa/applications/form/draft/cv-0123456789abcdef.pdf',
  original_filename: 'cv',
  format: 'pdf',
  bytes: 2048,
  resource_type: 'image',
};

const pdf = (): File => new File(['%PDF-1.4 test'], 'cv.pdf', { type: 'application/pdf' });

const pick = (file: File): void => {
  fireEvent.change(screen.getByTestId('field-cv-picker'), { target: { files: [file] } });
};

const openDocumentsStep = async (): Promise<void> => {
  renderApplyRoute('/apply/speakers');
  await findScreenHeading('Speak at our summit');
  fireEvent.click(screen.getByRole('button', { name: 'Begin' }));
  await findScreenHeading('Documents');
};

const latestXhr = (): FakeXhr => {
  const xhr = FakeXhr.instances.at(-1);
  if (!xhr) {
    throw new Error('No upload was started');
  }
  return xhr;
};

withInstantMotion();

beforeEach(() => {
  FakeXhr.instances = [];
  stubStorage();
  vi.stubGlobal('XMLHttpRequest', FakeXhr);
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
  vi.mocked(getPublicForm).mockResolvedValue(makeFileForm());
  vi.mocked(createDraft).mockResolvedValue({ token: DRAFT_TOKEN, draft: makeDraft() });
  vi.mocked(signUpload).mockResolvedValue(SIGNED);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('file questions', () => {
  it('states what is accepted before anything is picked', async () => {
    await openDocumentsStep();
    expect(screen.getByText('One file, up to 5 MB. Accepted types: PDF.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Choose a file' })).toBeInTheDocument();
  });

  it('signs, uploads with real progress, holds Continue, then lists the file', async () => {
    await openDocumentsStep();
    const file = pdf();
    pick(file);

    await waitFor(() => expect(FakeXhr.instances).toHaveLength(1));
    expect(signUpload).toHaveBeenCalledWith(
      'speakers',
      DRAFT_TOKEN,
      { fieldId: 'cv', filename: 'cv.pdf', bytes: file.size },
      expect.any(AbortSignal),
    );
    const xhr = latestXhr();
    expect(xhr.method).toBe('POST');
    expect(xhr.url).toMatch(/^https:\/\/api\.cloudinary\.com\/v1_1\/demo\/auto\/upload\?_origin=/);
    expect(xhr.body?.get('signature')).toBe('signed');
    expect(xhr.body?.get('type')).toBe('authenticated');
    expect(xhr.body?.get('file')).toBeInstanceOf(File);

    xhr.progress(50, 100);
    expect(screen.getByRole('progressbar', { name: 'Uploading cv.pdf' })).toHaveAttribute(
      'aria-valuenow',
      '50',
    );
    expect(screen.getByText('Uploading, 50%')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Uploading…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Back' })).toBeDisabled();

    xhr.respond(200, CLOUDINARY_RESULT);
    expect(await screen.findByRole('button', { name: 'Remove cv.pdf' })).toBeInTheDocument();
    expect(screen.getByText('Uploaded, 2 KB')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Choose a file' })).not.toBeInTheDocument();

    fireEvent.click(await screen.findByRole('button', { name: 'Review answers' }));
    await findScreenHeading('Check your answers');
    const documents = screen.getByRole('region', { name: 'Documents' });
    expect(within(documents).getByText('cv.pdf')).toBeInTheDocument();
  });

  it('offers Retry after a failed upload and Remove to give up', async () => {
    await openDocumentsStep();
    pick(pdf());
    await waitFor(() => expect(FakeXhr.instances).toHaveLength(1));

    latestXhr().fail();
    expect(
      await screen.findByText('The upload did not finish. Check your connection and try again.'),
    ).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Review answers' })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: 'Retry uploading cv.pdf' }));
    await waitFor(() => expect(FakeXhr.instances).toHaveLength(2));
    latestXhr().respond(200, CLOUDINARY_RESULT);
    expect(await screen.findByRole('button', { name: 'Remove cv.pdf' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Remove cv.pdf' }));
    expect(screen.getByRole('button', { name: 'Choose a file' })).toBeInTheDocument();
  });

  it('turns away a file of the wrong type before signing anything', async () => {
    await openDocumentsStep();
    pick(new File(['x'], 'notes.docx'));

    expect(
      await screen.findByText('"notes.docx" is not a type this question accepts.'),
    ).toBeInTheDocument();
    expect(signUpload).not.toHaveBeenCalled();
  });

  it('still sends focus to a full question the server refused, so the file can be replaced', async () => {
    vi.mocked(submitDraft).mockRejectedValue(
      new ApiError(400, 'VALIDATION_ERROR', 'Some files need to be uploaded again', [
        { path: 'answers.cv', message: 'Upload "cv.pdf" again.' },
      ]),
    );
    await openDocumentsStep();
    pick(pdf());
    await waitFor(() => expect(FakeXhr.instances).toHaveLength(1));
    latestXhr().respond(200, CLOUDINARY_RESULT);
    fireEvent.click(await screen.findByRole('button', { name: 'Review answers' }));
    await findScreenHeading('Check your answers');

    fireEvent.click(screen.getByRole('button', { name: 'Send application' }));
    await findScreenHeading('Documents');

    expect(screen.queryByRole('button', { name: 'Choose a file' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove cv.pdf' })).toHaveFocus();
    expect(screen.getByRole('alert')).toHaveTextContent('Upload "cv.pdf" again.');
  });

  it('explains, and stops, when the draft has gone before a file could be signed', async () => {
    vi.mocked(signUpload).mockRejectedValue(new ApiError(404, 'NOT_FOUND', 'Not found'));
    await openDocumentsStep();
    pick(pdf());

    const row = (await screen.findByText('cv.pdf')).closest('li');
    expect(row).not.toBeNull();
    expect(
      await within(row as HTMLElement).findByText(
        /Files cannot be added to this application any more/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('alert', { name: 'We can no longer save this application' }),
    ).toBeInTheDocument();
    expect(FakeXhr.instances).toHaveLength(0);
    expect(createDraft).toHaveBeenCalledTimes(1);
  });

  it('requires a file before moving on', async () => {
    await openDocumentsStep();
    fireEvent.click(screen.getByRole('button', { name: 'Review answers' }));

    const summary = await screen.findByRole('alert');
    expect(summary).toHaveTextContent('Your CV');
    expect(summary).toHaveTextContent('Add a file.');
    expect(screen.getByRole('button', { name: 'Choose a file' })).toHaveFocus();
  });
});
