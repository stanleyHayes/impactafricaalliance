import { ORG } from '@iaa/shared';
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: ORG.name,
  alternateName: ORG.shortName,
  url: ORG.website,
  logo: `${ORG.website}/brand/logo-primary.png`,
  sameAs: [
    'https://www.linkedin.com/company/impact-africa-alliance',
    'https://www.instagram.com/impactafricaalliance',
    'https://twitter.com/impactafricaall',
    'https://www.facebook.com/impactafricaalliance',
    'https://www.youtube.com/@impactafricaalliance',
  ],
  description: ORG.description,
  areaServed: {
    '@type': 'Continent',
    name: 'Africa',
  },
};

/** Injects JSON-LD Organization schema into the page head. */
export const SchemaOrg = (): null => {
  const { pathname } = useLocation();

  useEffect(() => {
    const id = 'iaa-schema-org';
    let script = document.getElementById(id) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = id;
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }

    const websiteSchema = {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: ORG.name,
      url: ORG.website,
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${ORG.website}/news?q={search_term_string}`,
        },
        'query-input': 'required name=search_term_string',
      },
    };

    script.textContent = JSON.stringify([organizationSchema, websiteSchema]);
  }, [pathname]);

  return null;
};
