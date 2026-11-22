import type {
  BrowseFilters,
  BrowseResponse,
  CuratedCollection,
  GenreItem,
  HomeCatalogResponse,
  MediaDetail,
  MediaItem,
  MediaType,
  StreamResponse,
} from '../types/media';

async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.error || `Request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

const CLIENT_TTL_MS = 3 * 60 * 1000;
const detailPromiseCache = new Map<
  string,
  { expiresAt: number; promise: Promise<{ detail: MediaDetail; related: MediaItem[] }> }
>();
const streamPromiseCache = new Map<
  string,
  { expiresAt: number; promise: Promise<StreamResponse> }
>();

export function fetchHomeCatalog(): Promise<HomeCatalogResponse> {
  return apiGet<HomeCatalogResponse>('/api/netmirror/home');
}

export function fetchTrendingNow(type: 'all' | 'movie' | 'tv' = 'all'): Promise<CuratedCollection> {
  const qs = type !== 'all' ? `?type=${encodeURIComponent(type)}` : '';
  return apiGet<CuratedCollection>(`/api/netmirror/trending${qs}`);
}

export function fetchGenres(): Promise<{ genres: GenreItem[] }> {
  return apiGet<{ genres: GenreItem[] }>('/api/netmirror/genres');
}

export function fetchCollection(id: string, page = 0): Promise<BrowseResponse> {
  return apiGet<BrowseResponse>(`/api/netmirror/collection/${encodeURIComponent(id)}?page=${page}`);
}

export function browseCatalog(filters: BrowseFilters): Promise<BrowseResponse> {
  const params = new URLSearchParams();
  params.set('page', String(filters.page ?? 0));
  if (filters.type && filters.type !== 'all') params.set('type', filters.type);
  if (filters.genreId) params.set('genreId', filters.genreId);
  if (filters.platform) params.set('platform', filters.platform);
  if (filters.dubbing) params.set('dubbing', filters.dubbing);
  if (filters.country) params.set('country', filters.country);
  if (filters.sortBy) params.set('sortBy', filters.sortBy);
  return apiGet<BrowseResponse>(`/api/netmirror/browse?${params.toString()}`);
}

export function suggestTitles(query: string): Promise<{ results: MediaItem[] }> {
  return apiGet<{ results: MediaItem[] }>(`/api/netmirror/suggest?q=${encodeURIComponent(query)}`);
}

export function searchTitles(
  query: string,
  page = 0,
  type: '' | '1' | '2' = ''
): Promise<BrowseResponse> {
  const params = new URLSearchParams({ q: query, page: String(page) });
  if (type) params.set('type', type);
  return apiGet<BrowseResponse>(`/api/netmirror/search?${params.toString()}`);
}

export function fetchTitleDetail(
  mediaType: MediaType,
  id: string
): Promise<{ detail: MediaDetail; related: MediaItem[] }> {
  const key = `${mediaType}:${id}`;
  const cached = detailPromiseCache.get(key);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.promise;
  }
  const promise = apiGet<{ detail: MediaDetail; related: MediaItem[] }>(
    `/api/netmirror/detail/${mediaType}/${encodeURIComponent(id)}`
  ).catch((err) => {
    detailPromiseCache.delete(key);
    throw err;
  });
  detailPromiseCache.set(key, { expiresAt: Date.now() + CLIENT_TTL_MS, promise });
  return promise;
}

export function fetchStreamServers(params: {
  id: string;
  tmdbId?: string;
  subjectId?: string;
  title?: string;
  mediaType: MediaType;
  season?: number;
  episode?: number;
}): Promise<StreamResponse> {
  const se = params.season ?? 1;
  const ep = params.episode ?? 1;
  const key = `${params.mediaType}:${params.id}:${se}:${ep}`;
  const cached = streamPromiseCache.get(key);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.promise;
  }

  const qs = new URLSearchParams({
    id: params.id,
    mediaType: params.mediaType,
    se: String(se),
    ep: String(ep),
  });
  if (params.tmdbId) qs.set('tmdbId', params.tmdbId);
  if (params.subjectId) qs.set('subjectId', params.subjectId);
  if (params.title) qs.set('title', params.title);

  const promise = apiGet<StreamResponse>(`/api/netmirror/stream?${qs.toString()}`).catch((err) => {
    streamPromiseCache.delete(key);
    throw err;
  });
  streamPromiseCache.set(key, { expiresAt: Date.now() + CLIENT_TTL_MS, promise });
  return promise;
}

export function prefetchTitle(item: Pick<MediaItem, 'id' | 'mediaType' | 'title'>): void {
  fetchTitleDetail(item.mediaType, item.id).catch(() => {});
  fetchStreamServers({
    id: item.id,
    mediaType: item.mediaType,
    title: item.title,
    season: 1,
    episode: 1,
  }).catch(() => {});
}
