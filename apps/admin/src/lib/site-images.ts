import {
  resolveSiteImage,
  siteImageSlotsByPage,
  type MediaAsset,
  type ResolvedSiteImage,
  type SiteImage,
  type SiteImagePage,
  type SiteImageSlot,
} from '@iaa/shared';

/**
 * The console's view of the site image catalogue: every slot, what it shows
 * now and why. The catalogue is shared with the site, so a slot the site
 * reads is a slot listed here, with the same fallback the site draws.
 */

/** What an editor needs to know about one slot before changing it. */
export type SlotStatus = 'replaced' | 'shared' | 'original';

export interface SlotView {
  slot: SiteImageSlot;
  /** What the public site draws for this slot today. */
  resolved: ResolvedSiteImage;
  status: SlotStatus;
  /**
   * The slot's own record, switched on or off. Replacing edits it rather than
   * adding a second, and resetting switches it off.
   */
  record?: SiteImage;
  /** A published Page Settings hero image that the site shows in this slot's place. */
  pageSettingOverride?: { id: string; url: string };
}

export interface SlotGroup {
  page: SiteImagePage;
  slots: SlotView[];
}

/** The fields of a Page Settings row this page reads. */
export interface PageSettingHero {
  id: string;
  pageKey?: unknown;
  status?: unknown;
  heroImage?: unknown;
}

const isLive = (record: SiteImage): boolean => Boolean(record.isActive && record.image?.url);

/**
 * The record to edit for a slot. Production builds no unique index on its
 * own, so two rows for one slot are possible: the live one is the one the
 * site shows, so that is the one to change.
 */
export const slotRecord = (key: string, records: readonly SiteImage[]): SiteImage | undefined => {
  const own = records.filter((record) => record.key === key);
  return own.find(isLive) ?? own[0];
};

const STATUS: Record<ResolvedSiteImage['source'], SlotStatus> = {
  upload: 'replaced',
  inherited: 'shared',
  default: 'original',
};

const heroOverride = (
  slot: SiteImageSlot,
  pageSettings: readonly PageSettingHero[],
): SlotView['pageSettingOverride'] => {
  if (!slot.pageSetting) return undefined;
  const row = pageSettings.find(
    (entry) => entry.pageKey === slot.pageSetting && entry.status === 'published',
  );
  const url = (row?.heroImage as MediaAsset | undefined)?.url;
  return row && url ? { id: row.id, url } : undefined;
};

export const slotView = (
  slot: SiteImageSlot,
  records: readonly SiteImage[],
  pageSettings: readonly PageSettingHero[] = [],
): SlotView => {
  const resolved = resolveSiteImage(slot.key, records);
  const record = slotRecord(slot.key, records);
  const override = heroOverride(slot, pageSettings);
  return {
    slot,
    resolved,
    status: STATUS[resolved.source],
    ...(record ? { record } : {}),
    ...(override ? { pageSettingOverride: override } : {}),
  };
};

/** Every slot, grouped by page in the site's menu order. */
export const buildSiteImageBoard = (
  records: readonly SiteImage[],
  pageSettings: readonly PageSettingHero[] = [],
): SlotGroup[] =>
  siteImageSlotsByPage().map(({ page, slots }) => ({
    page,
    slots: slots.map((slot) => slotView(slot, records, pageSettings)),
  }));

export type StatusFilter = 'all' | 'replaced' | 'original';

export interface BoardFilters {
  query: string;
  status: StatusFilter;
  page: string;
}

const matchesQuery = (view: SlotView, page: SiteImagePage, needle: string): boolean =>
  !needle ||
  [view.slot.label, view.slot.section, view.slot.usage, page.label]
    .join(' ')
    .toLowerCase()
    .includes(needle);

/** "Original" means what the site shipped with, whether a slot shares an upload or not. */
const matchesStatus = (view: SlotView, status: StatusFilter): boolean =>
  status === 'all' || (status === 'replaced') === (view.status === 'replaced');

/** Narrow the board, dropping pages left with nothing to show. */
export const filterBoard = (groups: readonly SlotGroup[], filters: BoardFilters): SlotGroup[] => {
  const needle = filters.query.trim().toLowerCase();
  return groups
    .filter((group) => filters.page === 'all' || group.page.key === filters.page)
    .map((group) => ({
      ...group,
      slots: group.slots.filter(
        (view) => matchesQuery(view, group.page, needle) && matchesStatus(view, filters.status),
      ),
    }))
    .filter((group) => group.slots.length > 0);
};

/** How many slots show an upload of their own. */
export const countReplaced = (groups: readonly SlotGroup[]): number =>
  groups.reduce(
    (total, group) => total + group.slots.filter((view) => view.status === 'replaced').length,
    0,
  );

/** "2000 × 860 px or larger", the size the site needs to stay sharp. */
export const recommendedSize = (slot: SiteImageSlot): string =>
  `${slot.recommended.width} × ${slot.recommended.height} px or larger`;

/** "21:9" rather than "21 / 9", as the shape is written elsewhere in the console. */
export const aspectLabel = (slot: SiteImageSlot): string =>
  slot.aspect === '1200 / 630' ? '1.91:1' : slot.aspect.replace(/\s*\/\s*/, ':');

/**
 * Whether a chosen picture is smaller than the slot needs. Only known when
 * the upload recorded its size; a picture from before that is not flagged.
 */
export const isUndersized = (slot: SiteImageSlot, image: MediaAsset | undefined): boolean =>
  Boolean(
    image?.width &&
    image.height &&
    (image.width < slot.recommended.width * 0.9 || image.height < slot.recommended.height * 0.9),
  );

const SITE_URL = (
  (import.meta.env.VITE_SITE_URL as string | undefined) ?? 'https://www.impactafricaalliance.org'
).replace(/\/+$/, '');

/**
 * A path on the public site as a full address. The shipped pictures live on
 * the marketing site, not here, so the console loads them from there; set
 * `VITE_SITE_URL` to a local site to check them offline.
 */
export const publicSiteUrl = (path: string): string =>
  path.startsWith('/') ? `${SITE_URL}${path}` : path;

/**
 * A Cloudinary upload at card size. Twenty-odd full-size photographs on one
 * page is tens of megabytes; the card is never wider than about 400 pixels.
 * Signed and non-Cloudinary addresses are left alone.
 */
export const thumbnailUrl = (url: string): string =>
  url.replace(
    /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(?!s--)/,
    '$1f_auto,q_auto,c_limit,w_720/',
  );
