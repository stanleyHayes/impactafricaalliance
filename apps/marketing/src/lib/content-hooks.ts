import type {
  Article,
  Event,
  GalleryItem,
  ImpactStat,
  Job,
  Office,
  PageSetting,
  Paginated,
  Partner,
  PillarImage,
  Report,
  SiteImage,
  SiteSetting,
  Story,
  TeamMember,
} from '@iaa/shared';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { apiGet } from './api-client';

const page = <T>(resource: string, params = ''): Promise<Paginated<T>> =>
  apiGet<Paginated<T>>(`/${resource}${params}`);

export const useArticles = (): UseQueryResult<Paginated<Article>> =>
  useQuery({ queryKey: ['articles'], queryFn: () => page<Article>('articles', '?pageSize=9') });

export const useArticle = (slug: string): UseQueryResult<Article> =>
  useQuery({ queryKey: ['articles', slug], queryFn: () => apiGet<Article>(`/articles/${slug}`) });

export const useStories = (): UseQueryResult<Paginated<Story>> =>
  useQuery({ queryKey: ['stories'], queryFn: () => page<Story>('stories', '?pageSize=12') });

export const useTeam = (): UseQueryResult<Paginated<TeamMember>> =>
  useQuery({ queryKey: ['team'], queryFn: () => page<TeamMember>('team', '?pageSize=100') });

export const useTeamMember = (memberId: string): UseQueryResult<TeamMember> =>
  useQuery({
    queryKey: ['team', memberId],
    queryFn: () => apiGet<TeamMember>('/team/' + encodeURIComponent(memberId)),
    enabled: Boolean(memberId),
  });

export const usePillarImages = (): UseQueryResult<Paginated<PillarImage>> =>
  useQuery({
    queryKey: ['pillar-images'],
    queryFn: () => page<PillarImage>('pillar-images', '?pageSize=50'),
    staleTime: 5 * 60 * 1000,
  });

export const useSiteImages = (): UseQueryResult<Paginated<SiteImage>> =>
  useQuery({
    queryKey: ['site-images'],
    queryFn: () => page<SiteImage>('site-images', '?pageSize=50'),
    staleTime: 5 * 60 * 1000,
  });

export const useEvent = (eventId: string): UseQueryResult<Event> =>
  useQuery({
    queryKey: ['events', eventId],
    queryFn: () => apiGet<Event>(`/events/${eventId}`),
    enabled: Boolean(eventId),
  });

export const useOffices = (): UseQueryResult<Paginated<Office>> =>
  useQuery({ queryKey: ['offices'], queryFn: () => page<Office>('offices', '?pageSize=100') });

export const usePartners = (): UseQueryResult<Paginated<Partner>> =>
  useQuery({ queryKey: ['partners'], queryFn: () => page<Partner>('partners', '?pageSize=100') });

export const useReports = (): UseQueryResult<Paginated<Report>> =>
  useQuery({ queryKey: ['reports'], queryFn: () => page<Report>('reports', '?pageSize=50') });

export const useJobs = (): UseQueryResult<Paginated<Job>> =>
  useQuery({ queryKey: ['jobs'], queryFn: () => page<Job>('jobs', '?pageSize=50') });

export const useJob = (slug: string): UseQueryResult<Job> =>
  useQuery({ queryKey: ['jobs', slug], queryFn: () => apiGet<Job>(`/jobs/${slug}`) });

export const useEvents = (): UseQueryResult<Paginated<Event>> =>
  useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const first = await page<Event>('events', '?pageSize=100');
      const items = [...first.items];
      for (let current = 2; current <= first.totalPages; current += 1) {
        const next = await page<Event>('events', `?pageSize=100&page=${current}`);
        items.push(...next.items);
      }
      return { ...first, items };
    },
  });

export const useImpactStats = (): UseQueryResult<Paginated<ImpactStat>> =>
  useQuery({
    queryKey: ['stats'],
    queryFn: async () => {
      const first = await page<ImpactStat>('stats', '?pageSize=20');
      const items = [...first.items];
      for (let current = 2; current <= first.totalPages; current += 1) {
        const next = await page<ImpactStat>('stats', `?pageSize=20&page=${current}`);
        items.push(...next.items);
      }
      return { ...first, items };
    },
  });

/** Published programme photography, newest programmes first. */
export const useGallery = (): UseQueryResult<Paginated<GalleryItem>> =>
  useQuery({ queryKey: ['gallery'], queryFn: () => page<GalleryItem>('gallery', '?pageSize=40') });

/**
 * Organisation contact details managed from the admin dashboard. Consumers
 * fall back to the static `ORG` constants while this is loading or unset, so
 * the site never renders an empty contact block.
 */
export const useSiteSettings = (): UseQueryResult<SiteSetting> =>
  useQuery({
    queryKey: ['site-settings'],
    queryFn: () => apiGet<SiteSetting>('/site-settings'),
    staleTime: 5 * 60 * 1000,
  });

export const usePageSetting = (pageKey: string): UseQueryResult<PageSetting> =>
  useQuery({
    queryKey: ['page-settings', pageKey],
    queryFn: () => apiGet<PageSetting>(`/page-settings/${pageKey}`),
    staleTime: 5 * 60 * 1000,
  });

export const useHeroImage = (pageKey: string, fallback: string): string => {
  const { data } = usePageSetting(pageKey);
  return data?.heroImage?.url ?? fallback;
};

export interface PageCopyDefaults {
  seoTitle: string;
  seoDescription: string;
  heroEyebrow?: string;
  heroTitle: string;
  heroSubtitle: string;
  introEyebrow?: string;
  introTitle?: string;
  introBody?: string;
  bodyContent?: string;
  ctaTitle?: string;
  ctaBody?: string;
  ctaLabel?: string;
  ctaUrl?: string;
}

/** Merge published CMS page copy over stable in-code defaults. */
export const usePageCopy = (
  pageKey: string,
  defaults: PageCopyDefaults,
): PageCopyDefaults & { heroImageUrl?: string } => {
  const { data } = usePageSetting(pageKey);
  const value = (key: keyof PageCopyDefaults): string | undefined => {
    const candidate = data?.[key];
    return typeof candidate === 'string' && candidate.trim() ? candidate : defaults[key];
  };

  return {
    seoTitle: value('seoTitle') ?? defaults.seoTitle,
    seoDescription: value('seoDescription') ?? defaults.seoDescription,
    heroEyebrow: value('heroEyebrow'),
    heroTitle: value('heroTitle') ?? defaults.heroTitle,
    heroSubtitle: value('heroSubtitle') ?? defaults.heroSubtitle,
    introEyebrow: value('introEyebrow'),
    introTitle: value('introTitle'),
    introBody: value('introBody'),
    bodyContent: value('bodyContent'),
    ctaTitle: value('ctaTitle'),
    ctaBody: value('ctaBody'),
    ctaLabel: value('ctaLabel'),
    ctaUrl: value('ctaUrl'),
    heroImageUrl: data?.heroImage?.url,
  };
};
