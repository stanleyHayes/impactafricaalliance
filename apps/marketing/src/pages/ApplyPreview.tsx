import Box from '@mui/material/Box';
import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';

import { Seo } from '../components/Seo';
import { ApplicantFlow } from '../features/applications/ApplicantFlow';
import { PreviewRibbon } from '../features/applications/chrome/PreviewRibbon';
import type { FormSource } from '../features/applications/queries';
import { StatusScreen } from '../features/applications/screens/StatusScreen';

/**
 * A staff preview of a form's applicant flow (`/apply/preview#<token>`, plan
 * D10). The token sits in the fragment, so it never reaches a server log or
 * analytics; it is sent to the API only as a header. The flow renders exactly
 * as applicants see it, but writes nothing: no draft, upload or submission.
 * Previews are never indexed and record no page view.
 */
const Page = (): JSX.Element => {
  const { hash } = useLocation();
  // A JWT, which is URL-safe as it stands, so nothing needs decoding.
  const token = hash.replace(/^#/, '').trim();
  const source = useMemo<FormSource>(() => ({ kind: 'preview', token }), [token]);

  return (
    <>
      <Seo title="Form preview" noindex />
      {token ? (
        <ApplicantFlow key={token} source={source} />
      ) : (
        <Box
          sx={{
            display: 'flex',
            minHeight: '100vh',
            flexDirection: 'column',
            bgcolor: 'background.default',
          }}
        >
          <PreviewRibbon />
          <Box component="main" sx={{ display: 'flex', flex: 1, flexDirection: 'column' }}>
            <StatusScreen kind="preview-missing" />
          </Box>
        </Box>
      )}
    </>
  );
};

export default Page;
