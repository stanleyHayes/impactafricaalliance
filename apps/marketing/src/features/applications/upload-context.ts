import { createContext, useContext } from 'react';

import type { SessionActions } from './use-form-session';

/**
 * What a file question needs from the flow: a way to upload, a way to say it
 * is busy (which holds Continue), and whether this is a preview. Passed by
 * context so every question renderer keeps the same props.
 */
export interface UploadContextValue {
  uploadFile: SessionActions['uploadFile'];
  setUploadBusy: SessionActions['setUploadBusy'];
  preview: boolean;
}

export const UploadContext = createContext<UploadContextValue | null>(null);

export const useUploadContext = (): UploadContextValue => {
  const value = useContext(UploadContext);
  if (!value) {
    throw new Error('File questions must be rendered inside the applicant flow.');
  }
  return value;
};
