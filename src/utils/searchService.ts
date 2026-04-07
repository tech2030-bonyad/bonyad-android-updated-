/**
 * Search Service — Unified search with caching, debounce, and region loading.
 *
 * Same algorithm as the web app's searchService.ts.
 * Uses smart search (substring, fuzzy, scoring) for categories & subcategories.
 * Technicians fetched via API, then ranked and highlighted with smart search.
 */

import { getAllServices, ServiceCategoryOrSub } from '../services/ServiceService';
import { getTechnicians } from '../services/TechnicianService';
import { buildApiUrl, API_ENDPOINTS } from '../config/api';
import { smartSearch, SEARCH_DEBOUNCE_MS } from './smartSearch';
import type { ScoredMatch } from './smartSearch';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ServiceCategory = ServiceCategoryOrSub;

export interface Region {
  id: number;
  nameAr: string;
  nameEn: string;
  techniciansCount: number;
}

export interface TechnicianSearchResult {
  id: number;
  name: string;
  phoneNumber?: string;
  status?: string;
  averageRating: number;
  totalReviews: number;
  profilePicture?: string;
  isCompany?: boolean;
  companyName?: string | null;
  crNumber?: string | null;
  services?: { id: number; nameEn: string; nameAr?: string }[];
  regions?: { id: number; nameEn: string; nameAr?: string }[];
}

export interface ScoredSearchResults {
  categories: ScoredMatch<ServiceCategory>[];
  subcategories: ScoredMatch<ServiceCategory>[];
  technicians: ScoredMatch<TechnicianSearchResult>[];
}

export const EMPTY_SCORED_RESULTS: ScoredSearchResults = {
  categories: [],
  subcategories: [],
  technicians: [],
};

export { SEARCH_DEBOUNCE_MS };

// ─── Cache ────────────────────────────────────────────────────────────────────

interface CacheEntry<T> {
  data: T;
  ts: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

let allServicesCache: CacheEntry<ServiceCategoryOrSub[]> | null = null;
let regionsCache: CacheEntry<Region[]> | null = null;

function isFresh<T>(entry: CacheEntry<T> | null): entry is CacheEntry<T> {
  return entry !== null && Date.now() - entry.ts < CACHE_TTL_MS;
}

export async function getCachedAllServices(): Promise<ServiceCategoryOrSub[]> {
  if (isFresh(allServicesCache)) return allServicesCache.data;
  const data = await getAllServices();
  allServicesCache = { data, ts: Date.now() };
  return data;
}

export async function getCachedRegions(): Promise<Region[]> {
  if (isFresh(regionsCache)) return regionsCache.data;
  try {
    const url = buildApiUrl(API_ENDPOINTS.ZONES.LIST);
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) throw new Error(`Regions fetch failed: ${response.status}`);
    const data: Region[] = await response.json();
    regionsCache = { data: Array.isArray(data) ? data : [], ts: Date.now() };
    return regionsCache.data;
  } catch (err) {
    console.error('❌ [SearchService] Error loading regions:', err);
    return [];
  }
}

export function clearSearchCaches(): void {
  allServicesCache = null;
  regionsCache = null;
}

// ─── Searchable string extractors ─────────────────────────────────────────────

function getServiceSearchableStrings(s: ServiceCategory, lang: string = 'en', queryLength: number = 99): string[] {
  const isAr = lang === 'ar';
  // For short queries (≤3 chars), only search names — descriptions and parent names
  // produce too many false positives (e.g. "es" matching every service whose
  // description contains "Services", "Structures", etc.)
  const names: (string | undefined)[] = [
    isAr ? (s.nameAr || s.nameEn) : s.nameEn,
    isAr ? s.nameEn : s.nameAr,
  ];
  if (queryLength > 3) {
    names.push(
      isAr ? (s.descriptionAr || s.description) : (s.descriptionEn || s.description),
      isAr ? (s.descriptionEn || s.description) : (s.descriptionAr || s.description),
      isAr ? (s.parentService?.nameAr || s.parentService?.nameEn) : s.parentService?.nameEn,
      isAr ? s.parentService?.nameEn : s.parentService?.nameAr,
    );
  }
  return names.filter((x): x is string => typeof x === 'string' && x.length > 0);
}

function getTechnicianSearchableStrings(t: TechnicianSearchResult | any): string[] {
  const name = t?.name ?? t?.userName ?? t?.fullName ?? '';
  const phone = t?.phoneNumber ?? t?.phone ?? '';
  const base = [name, phone].filter((x): x is string => typeof x === 'string' && x.length > 0);
  const services = t?.services ?? t?.serviceList ?? [];
  const serviceNames = (Array.isArray(services) ? services : [])
    .flatMap((s: any) => [s?.nameEn, s?.nameAr, s?.name])
    .filter((x): x is string => typeof x === 'string' && x.length > 0);
  return [...base, ...serviceNames];
}

function normalizeTechnician(t: any, searchQuery?: string): TechnicianSearchResult {
  const id = t?.id ?? t?.userId ?? t?.technicianId ?? 0;
  const name = t?.name ?? t?.userName ?? t?.fullName ?? '';
  let services = (t?.services ?? t?.serviceList ?? []).map((s: any) => ({
    id: s?.id ?? 0,
    nameEn: s?.nameEn ?? s?.name ?? '',
    nameAr: s?.nameAr ?? '',
  })).filter((s: any) => s.id || s.nameEn);

  if (searchQuery && services.length > 1) {
    const queryLower = searchQuery.toLowerCase();
    const matchIndex = services.findIndex((s: any) =>
      s.nameEn.toLowerCase().includes(queryLower) ||
      (s.nameAr && s.nameAr.toLowerCase().includes(queryLower))
    );
    if (matchIndex > 0) {
      const matched = services.splice(matchIndex, 1)[0];
      services.unshift(matched);
    }
  }

  return {
    id: Number(id),
    name: String(name),
    phoneNumber: t?.phoneNumber ?? t?.phone,
    status: t?.status,
    averageRating: Number(t?.averageRating ?? t?.rating ?? 0),
    totalReviews: Number(t?.totalReviews ?? t?.reviewsCount ?? 0),
    profilePicture: t?.profilePicture ?? t?.profileImage ?? t?.imageUrl,
    isCompany: t?.isCompany ?? false,
    companyName: t?.companyName ?? null,
    crNumber: t?.crNumber ?? null,
    services: services.length ? services : undefined,
    regions: t?.regions ?? t?.zones,
  };
}

// ─── Unified Search ──────────────────────────────────────────────────────────

export async function unifiedSearch(
  query: string,
  regionId?: number,
  lang: string = 'en',
): Promise<ScoredSearchResults> {
  const q = query.trim();
  if (q.length < 2) return EMPTY_SCORED_RESULTS;

  const searchableStrings = (s: ServiceCategory) => getServiceSearchableStrings(s, lang, q.length);

  try {
    const allServices = await getCachedAllServices();
    const categories = allServices.filter((s) => s.isCategory);
    const subcategories = allServices.filter((s) => !s.isCategory);

    let scoredCategories = smartSearch({
      items: categories,
      query: q,
      getSearchableStrings: searchableStrings,
      maxResults: 5,
      minQueryLength: 1,
    });

    const scoredSubcategories = smartSearch({
      items: subcategories,
      query: q,
      getSearchableStrings: searchableStrings,
      maxResults: 8,
      minQueryLength: 1,
    });

    let matchingServiceIds = scoredSubcategories.map((s) => s.item.id);

    if (matchingServiceIds.length === 0 && q.length > 2) {
      const prefixSubs = smartSearch({
        items: subcategories,
        query: q.slice(0, -1),
        getSearchableStrings: searchableStrings,
        maxResults: 4,
        minQueryLength: 1,
      });
      matchingServiceIds = prefixSubs.map((s) => s.item.id);
    }

    const MIN_SERVICE_SCORE = 45;
    scoredCategories = scoredCategories.filter((s) => s.score >= MIN_SERVICE_SCORE);
    const scoredSubcategoriesFiltered = scoredSubcategories.filter((s) => s.score >= MIN_SERVICE_SCORE);

    let rawTechnicians: TechnicianSearchResult[] = [];
    const seen = new Set<number>();

    try {
      // Always search by name AND by matching service IDs in parallel.
      // This prevents cases where a fuzzy subcategory match (e.g. "eslam" → "Islam")
      // blocks the name-based search that would find technician "Eslam".
      const promises: Promise<any[]>[] = [
        getTechnicians(undefined, regionId, q, 0, 20), // name search
      ];
      if (matchingServiceIds.length > 0) {
        const serviceIdsToFetch = matchingServiceIds.slice(0, 2);
        promises.push(
          ...serviceIdsToFetch.map((sid) => getTechnicians(sid, regionId, undefined, 0, 20))
        );
      }
      const results = await Promise.all(promises);
      const allTechs = results.flat();
      for (const t of allTechs.map((t) => normalizeTechnician(t, q))) {
        if (!seen.has(t.id)) { seen.add(t.id); rawTechnicians.push(t); }
      }
    } catch (err) {
      console.warn('⚠️ [SearchService] Technician search failed:', err);
    }

    let scoredTechnicians = smartSearch({
      items: rawTechnicians,
      query: q,
      getSearchableStrings: getTechnicianSearchableStrings,
      maxResults: 10,
      minQueryLength: 1,
    });

    if (scoredTechnicians.length === 0 && rawTechnicians.length > 0 && matchingServiceIds.length > 0) {
      scoredTechnicians = rawTechnicians.slice(0, 10).map((tech) => ({
        item: tech,
        score: 50,
        matchType: 'substring' as const,
        highlightParts: [{ text: tech.name, highlight: false }],
      }));
    }

    return {
      categories: scoredCategories,
      subcategories: scoredSubcategoriesFiltered,
      technicians: scoredTechnicians,
    };
  } catch (err) {
    console.error('❌ [SearchService] unifiedSearch error:', err);
    return EMPTY_SCORED_RESULTS;
  }
}

// ─── Debounce Utility ────────────────────────────────────────────────────────

export function debounce<T extends (...args: any[]) => void>(
  fn: T,
  delayMs: number,
): [T, () => void] {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const debounced = ((...args: any[]) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn(...args);
      timer = null;
    }, delayMs);
  }) as unknown as T;

  const cancel = () => {
    if (timer) { clearTimeout(timer); timer = null; }
  };

  return [debounced, cancel];
}
