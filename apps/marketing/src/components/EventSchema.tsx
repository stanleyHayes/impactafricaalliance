import { ORG, type Event } from '@iaa/shared';
import { useEffect } from 'react';

import { IMAGES } from '../content/images';

const SCRIPT_ID = 'iaa-event-schema';

/**
 * Emits schema.org Event JSON-LD for a single event.
 *
 * Search Console flags `image`, `performer` and `organizer` as missing when
 * they are absent, so all three are always populated: the image falls back to
 * a site asset when an event has no artwork of its own, the performer is the
 * session's mentor (the organisation itself when none is named), and the
 * organiser is always the Alliance.
 *
 * Online sessions need `VirtualLocation`, not a postal address — Google treats
 * a physical `location` on an online event as an error.
 */
export const EventSchema = ({ event }: { event: Event }): null => {
  useEffect(() => {
    const isOnline = /online|virtual|webinar|zoom/i.test(event.location);
    const url = `${ORG.website}/events/${event.id}`;
    const image = event.image?.url ?? `${ORG.website}${IMAGES.hero}`;

    const schema: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'Event',
      name: event.title,
      description: event.description,
      startDate: event.startAt,
      ...(event.endAt ? { endDate: event.endAt } : {}),
      eventStatus: 'https://schema.org/EventScheduled',
      eventAttendanceMode: isOnline
        ? 'https://schema.org/OnlineEventAttendanceMode'
        : 'https://schema.org/OfflineEventAttendanceMode',
      location: isOnline
        ? { '@type': 'VirtualLocation', url }
        : { '@type': 'Place', name: event.location, address: event.location },
      image: [image],
      url,
      performer: event.host
        ? { '@type': 'Person', name: event.host, ...(event.hostTitle ? { jobTitle: event.hostTitle } : {}) }
        : { '@type': 'Organization', name: ORG.name, url: ORG.website },
      organizer: { '@type': 'Organization', name: ORG.name, url: ORG.website },
      isAccessibleForFree: /free/i.test(event.admission ?? ''),
      offers: {
        '@type': 'Offer',
        url,
        price: 0,
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
        validFrom: event.createdAt ?? event.startAt,
      },
    };

    let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = SCRIPT_ID;
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(schema);

    // Removed on unmount so a stale event's markup never outlives its page.
    return () => {
      document.getElementById(SCRIPT_ID)?.remove();
    };
  }, [event]);

  return null;
};
