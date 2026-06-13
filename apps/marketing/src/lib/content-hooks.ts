import type {
  Article,
  ImpactStat,
  Job,
  Paginated,
  Partner,
  Report,
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

export const usePartners = (): UseQueryResult<Paginated<Partner>> =>
  useQuery({ queryKey: ['partners'], queryFn: () => page<Partner>('partners', '?pageSize=100') });

export const useReports = (): UseQueryResult<Paginated<Report>> =>
  useQuery({ queryKey: ['reports'], queryFn: () => page<Report>('reports', '?pageSize=50') });

export const useJobs = (): UseQueryResult<Paginated<Job>> =>
  useQuery({ queryKey: ['jobs'], queryFn: () => page<Job>('jobs', '?pageSize=50') });

export const useImpactStats = (): UseQueryResult<Paginated<ImpactStat>> =>
  useQuery({ queryKey: ['stats'], queryFn: () => page<ImpactStat>('stats', '?pageSize=20') });
