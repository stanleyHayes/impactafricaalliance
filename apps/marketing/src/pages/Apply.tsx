import { useEffect, useMemo } from 'react';
import { useLocation, useParams } from 'react-router-dom';

import { Seo } from '../components/Seo';
import { ApplicantFlow } from '../features/applications/ApplicantFlow';
import { useApplicationForm, type FormSource } from '../features/applications/queries';
import { recordPageView } from '../lib/analytics';

/**
 * The applicant flow for a published form (`/apply/:slug`, plan §5.1).
 *
 * The route sits outside `Layout` for minimal chrome, so this page records
 * its own view the way `Layout` does: once per path, never with the fragment,
 * which may hold a resume token.
 */
const Page = (): JSX.Element => {
  const { slug = '' } = useParams();
  const { pathname } = useLocation();
  const source = useMemo<FormSource>(() => ({ kind: 'public', slug }), [slug]);
  // The same cached query the flow uses, read here for the page title.
  const { data: form } = useApplicationForm(source);

  useEffect(() => {
    recordPageView(pathname);
  }, [pathname]);

  return (
    <>
      <Seo
        title={form?.title ?? 'Apply'}
        description={form?.intro.description}
        image={form?.intro.image?.url}
        imageAlt={form?.intro.image?.alt}
        noindex={!form}
      />
      {/* Keyed by form, so moving to another form never carries answers across. */}
      <ApplicantFlow key={slug} source={source} />
    </>
  );
};

export default Page;
