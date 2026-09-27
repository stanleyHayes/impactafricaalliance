import type { FileAnswer } from '@iaa/shared';
import { describe, expect, it } from 'vitest';

import {
  draftFolderPrefix,
  fileLocationProblem,
  storedFileProblem,
  withStoredFacts,
  type DraftFileScope,
} from './application-files.js';

const formId = '64b7f0c2a1b2c3d4e5f60718';
const draftId = '64b7f0c2a1b2c3d4e5f60719';
const scope: DraftFileScope = { rootFolder: 'iaa', cloudName: 'iaa-cloud', formId, draftId };
const folder = `iaa/applications/${formId}/${draftId}`;

const file = (publicId: string, overrides: Partial<FileAnswer> = {}): FileAnswer => ({
  publicId,
  url: `https://res.cloudinary.com/iaa-cloud/image/authenticated/v1/${publicId}.pdf`,
  name: 'cv.pdf',
  format: 'pdf',
  bytes: 1000,
  ...overrides,
});

describe('where an applicant file may be', () => {
  it('accepts a file inside the draft folder, in our Cloudinary account', () => {
    expect(draftFolderPrefix(scope)).toBe(`${folder}/`);
    expect(draftFolderPrefix({ ...scope, rootFolder: 'iaa/' })).toBe(`${folder}/`);
    expect(fileLocationProblem(file(`${folder}/cv-0123456789abcdef`), scope)).toBeNull();
  });

  it('refuses a file from another draft, another form or a sibling folder', () => {
    const otherDraft = `iaa/applications/${formId}/${'0'.repeat(24)}/cv-1`;
    const sibling = `${folder}0/cv-1`;
    const outside = 'iaa/site/logo';
    for (const publicId of [otherDraft, sibling, outside, folder]) {
      expect(fileLocationProblem(file(publicId), scope)).toMatch(/Upload "cv\.pdf" again/);
    }
  });

  it('refuses an id that climbs out of the folder with dot segments', () => {
    const escape = `${folder}/../../${'0'.repeat(24)}/cv-1`;
    expect(escape.startsWith(`${folder}/`)).toBe(true);
    expect(fileLocationProblem(file(escape), scope)).not.toBeNull();
    expect(fileLocationProblem(file(`${folder}/./cv-1`), scope)).not.toBeNull();
  });

  it('refuses a link to another host or another Cloudinary account', () => {
    const publicId = `${folder}/cv-1`;
    const links = [
      'https://res.cloudinary.com.evil.example/iaa-cloud/image/authenticated/v1/cv.pdf',
      'https://evil.example/iaa-cloud/cv.pdf',
      'http://res.cloudinary.com/iaa-cloud/image/authenticated/v1/cv.pdf',
      'https://res.cloudinary.com/someone-else/image/authenticated/v1/cv.pdf',
      'https://res.cloudinary.com/x/iaa-cloud/cv.pdf',
      'not a url',
    ];
    for (const url of links) {
      expect(fileLocationProblem(file(publicId, { url }), scope)).not.toBeNull();
    }
  });

  it('refuses a link to a file other than the one the id names', () => {
    const publicId = `${folder}/cv-1`;
    const elsewhere = [
      'https://res.cloudinary.com/iaa-cloud/image/upload/v1/iaa/site/logo.png',
      `https://res.cloudinary.com/iaa-cloud/image/authenticated/v1/iaa/applications/${formId}/${'0'.repeat(24)}/cv-1.pdf`,
    ];
    for (const url of elsewhere) {
      expect(fileLocationProblem(file(publicId, { url }), scope)).toMatch(/Upload "cv\.pdf" again/);
    }
    const raw = `https://res.cloudinary.com/iaa-cloud/raw/authenticated/v2/${publicId}`;
    expect(fileLocationProblem(file(publicId, { url: raw }), scope)).toBeNull();
  });

  it('checks only the host when the account name is not known', () => {
    const publicId = `${folder}/cv-1`;
    const unconfigured = { ...scope, cloudName: null };
    const url = `https://res.cloudinary.com/anyone/image/authenticated/v1/${publicId}.pdf`;
    expect(fileLocationProblem(file(publicId, { url }), unconfigured)).toBeNull();
    expect(
      fileLocationProblem(file(publicId, { url: 'https://evil.example/x.pdf' }), unconfigured),
    ).not.toBeNull();
  });
});

describe('what Cloudinary holds', () => {
  const pdfOnly = { validation: { fileKinds: ['pdf' as const], maxSizeMB: 2 } };

  it('accepts a stored file within the size and type the question allows', () => {
    expect(storedFileProblem(pdfOnly, file('x'), { bytes: 1024, format: 'pdf' })).toBeNull();
  });

  it('refuses a stored file larger than the question allows, whatever the browser said', () => {
    expect(
      storedFileProblem(pdfOnly, file('x', { bytes: 10 }), {
        bytes: 3 * 1024 * 1024,
        format: 'pdf',
      }),
    ).toMatch(/larger than 2 MB/);
  });

  it('refuses a stored file of another type', () => {
    expect(storedFileProblem(pdfOnly, file('x'), { bytes: 10, format: 'png' })).toMatch(
      /not a type/,
    );
  });

  it('falls back to the file name for a raw upload Cloudinary gives no format for', () => {
    const docs = { validation: { fileKinds: ['document' as const] } };
    const raw = { bytes: 10, resourceType: 'raw' };
    expect(
      storedFileProblem(docs, file('x', { name: 'cv.docx', format: undefined }), raw),
    ).toBeNull();
    expect(
      storedFileProblem(docs, file('x', { name: 'cv.exe', format: undefined }), raw),
    ).not.toBeNull();
  });

  it('keeps the stored size and type on the answer', () => {
    expect(
      withStoredFacts(file('x', { bytes: 1 }), {
        bytes: 2048,
        format: 'pdf',
        resourceType: 'image',
      }),
    ).toMatchObject({ bytes: 2048, format: 'pdf', resourceType: 'image' });
    expect(withStoredFacts(file('x'), { bytes: 5, resourceType: 'unknown' })).not.toHaveProperty(
      'resourceType',
    );
  });
});
