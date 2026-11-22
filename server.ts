import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import type {
  BrowseResponse,
  CuratedCollection,
  GenreItem,
  HomeCatalogResponse,
  MediaDetail,
  MediaItem,
  MediaType,
  PagerInfo,
} from './src/types/media.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_BASE_V3 = 'https://api2.imdb3.shop/api';
const API_BASE_V4 = 'https://api2.imdb4.shop';

const REQUEST_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  Origin: 'https://netmirror.gold',
  Referer: 'https://netmirror.gold/',
};

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCached<T>(key: string, data: T, ttlMs: number): void {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

async function fetchJson<T>(url: string, timeoutMs = 9000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: REQUEST_HEADERS,
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`Upstream HTTP ${res.status}`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

function cleanText(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw
    .replace(/^"+|"+$/g, '')
    .replace(/\\"/g, '"')
    .replace(/\\n/g, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#0*39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseReleaseYear(raw: unknown): string {
  if (raw === null || raw === undefined || raw === '') return '';
  const str = String(raw).trim();
  if (/^\d{4}$/.test(str)) return str;
  if (/^\d{9,11}$/.test(str)) {
    const ms = Number(str) * 1000;
    const d = new Date(ms);
    if (!Number.isNaN(d.getUTCFullYear())) {
      return String(d.getUTCFullYear());
    }
  }
  const yearMatch = str.match(/\b(19|20)\d{2}\b/);
  return yearMatch ? yearMatch[0] : str;
}

function normalizeRating(raw: unknown): string {
  const num = Number(raw);
  if (!Number.isFinite(num) || num <= 0) return '—';
  return num.toFixed(1);
}

function normalizeMediaType(raw: unknown): MediaType {
  const s = String(raw || '').toLowerCase();
  return s === 'tv' || s === 'series' ? 'tv' : 'movie';
}

interface RawMediaRow {
  id?: string | number;
  title?: string;
  backdrop_path?: string;
  release_date?: string | number;
  media_type?: string;
  vote_average?: string | number;
  cn?: string;
  country?: string;
  genre?: Array<string | number>;
  info?: string;
  dis?: string;
  duration?: string | number;
  trailer?: string;
  season?: Array<{ se?: number; ep?: number; allEp?: string }> | null;
  stafflist?: Array<{
    staffId?: string;
    name?: string;
    character?: string;
    avatarUrl?: string;
  }>;
  subjectid?: string;
  tm_id?: string;
}

let genreLookupCache: Record<string, string> = {};

const EXCLUDED_GENRE_TIDS = new Set(['101', '315', '273']);

async function loadGenres(): Promise<GenreItem[]> {
  const cached = getCached<GenreItem[]>('genres');
  if (cached) return cached;

  const raw = await fetchJson<{ results?: Array<{ tid?: string; name?: string; count?: string }> }>(
    `${API_BASE_V3}/genre`
  );
  const allClean: GenreItem[] = (raw.results || [])
    .filter((g) => g.tid && g.name)
    .map((g) => ({
      tid: String(g.tid),
      name: cleanText(g.name),
      count: Number(g.count || 0),
    }));

  const lookup: Record<string, string> = {};
  for (const g of allClean) {
    lookup[g.tid] = g.name;
  }
  genreLookupCache = lookup;

  const seenNames = new Set<string>();
  const genres = allClean
    .filter((g) => !EXCLUDED_GENRE_TIDS.has(g.tid) && g.count >= 10)
    .sort((a, b) => b.count - a.count)
    .filter((g) => {
      const key = g.name.toLowerCase();
      if (seenNames.has(key)) return false;
      seenNames.add(key);
      return true;
    });

  setCached('genres', genres, 6 * 60 * 60 * 1000);
  return genres;
}

function mapMediaItem(row: RawMediaRow): MediaItem {
  const genreIds = Array.isArray(row.genre) ? row.genre.map(String) : [];
  const genres = genreIds
    .map((gid) => genreLookupCache[gid])
    .filter((name): name is string => Boolean(name));

  return {
    id: String(row.id || ''),
    title: cleanText(row.title) || 'Untitled',
    backdropPath: cleanText(row.backdrop_path),
    releaseYear: parseReleaseYear(row.release_date),
    releaseDateRaw: cleanText(String(row.release_date ?? '')),
    mediaType: normalizeMediaType(row.media_type),
    voteAverage: normalizeRating(row.vote_average),
    country: cleanText(row.country || row.cn || ''),
    genreIds,
    genres,
    info: cleanText(row.info),
  };
}

function mapMediaDetail(row: RawMediaRow): MediaDetail {
  const base = mapMediaItem(row);
  const durationSec = Number(row.duration || 0);
  const durationMinutes =
    Number.isFinite(durationSec) && durationSec > 60 ? Math.round(durationSec / 60) : null;

  return {
    ...base,
    description: cleanText(row.dis) || 'No synopsis available for this title yet.',
    durationMinutes,
    trailerUrl: cleanText(row.trailer),
    seasons: Array.isArray(row.season)
      ? row.season.map((s) => ({
          se: Number(s.se || 1),
          ep: Number(s.ep || 1),
          allEp: s.allEp || '',
        }))
      : [],
    cast: Array.isArray(row.stafflist)
      ? Array.from(
          row.stafflist
            .filter((c) => c.name)
            .reduce((acc, c) => {
              const staffId = String(c.staffId || c.name);
              const existing = acc.get(staffId);
              const role = cleanText(c.character);
              if (existing) {
                if (role && !existing.character.includes(role)) {
                  existing.character = existing.character
                    ? `${existing.character} / ${role}`
                    : role;
                }
              } else {
                acc.set(staffId, {
                  staffId,
                  name: cleanText(c.name),
                  character: role,
                  avatarUrl: cleanText(c.avatarUrl),
                });
              }
              return acc;
            }, new Map<string, { staffId: string; name: string; character: string; avatarUrl: string }>())
            .values()
        ).slice(0, 16)
      : [],
    subjectId: cleanText(row.subjectid),
    tmdbId: cleanText(row.tm_id),
  };
}

function mapPager(rawPager: unknown, fallbackCount: number): PagerInfo {
  const p = (rawPager && typeof rawPager === 'object' ? rawPager : {}) as Record<string, unknown>;
  return {
    currentPage: Number(p.current_page || 0),
    itemsPerPage: Number(p.items_per_page || 30),
    totalPages: Number(p.total_pages || 1),
    totalResults: Number(p.total_results || fallbackCount),
  };
}

const NON_ENGLISH_TAG_REGEX =
  /\[(hindi|telugu|tamil|malayalam|kannada|punjabi|marathi|bengali|bhojpuri|gujarati|urdu|chinese|korean|japanese|spanish|french|cam|dual audio)\]/i;
const NON_HINDI_TAG_REGEX =
  /\[(telugu|tamil|malayalam|kannada|punjabi|marathi|bengali|bhojpuri|gujarati)\]/i;

function filterByLanguage(items: MediaItem[], mode: 'hindi' | 'english'): MediaItem[] {
  if (mode === 'hindi') {
    return items.filter((item) => !NON_HINDI_TAG_REGEX.test(item.title));
  }
  return items.filter(
    (item) =>
      !NON_ENGLISH_TAG_REGEX.test(item.title) &&
      !/\bhindi\s*dubbed\b/i.test(item.title)
  );
}

const VIRTUAL_LANGUAGE_COLLECTIONS: Record<
  string,
  {
    title: string;
    subtitle: string;
    type: '1' | '2';
    lang: 'hindi' | 'english';
  }
> = {
  'hindi-movies': {
    title: 'Hindi Movies',
    subtitle: 'Bollywood releases & Hindi-dubbed cinema organized in Hindi',
    type: '1',
    lang: 'hindi',
  },
  'english-movies': {
    title: 'English Movies',
    subtitle: 'Original English Hollywood & international feature films',
    type: '1',
    lang: 'english',
  },
  'hindi-series': {
    title: 'Hindi Web Series',
    subtitle: 'Popular Hindi originals & Hindi-dubbed episodic series',
    type: '2',
    lang: 'hindi',
  },
  'english-series': {
    title: 'English Web Series',
    subtitle: 'Original English drama, thriller & sci-fi web series',
    type: '2',
    lang: 'english',
  },
};

const CURATED_COLLECTION_META: Array<{ id: string; title: string; subtitle: string }> = [
  { id: '11', title: 'Trending Now', subtitle: 'Most watched films and web series across regions' },
  {
    id: 'hindi-movies',
    title: VIRTUAL_LANGUAGE_COLLECTIONS['hindi-movies'].title,
    subtitle: VIRTUAL_LANGUAGE_COLLECTIONS['hindi-movies'].subtitle,
  },
  {
    id: 'english-movies',
    title: VIRTUAL_LANGUAGE_COLLECTIONS['english-movies'].title,
    subtitle: VIRTUAL_LANGUAGE_COLLECTIONS['english-movies'].subtitle,
  },
  {
    id: 'hindi-series',
    title: VIRTUAL_LANGUAGE_COLLECTIONS['hindi-series'].title,
    subtitle: VIRTUAL_LANGUAGE_COLLECTIONS['hindi-series'].subtitle,
  },
  {
    id: 'english-series',
    title: VIRTUAL_LANGUAGE_COLLECTIONS['english-series'].title,
    subtitle: VIRTUAL_LANGUAGE_COLLECTIONS['english-series'].subtitle,
  },
  { id: '15', title: 'South Indian Cinema', subtitle: 'Telugu, Tamil, Malayalam, and Kannada standouts' },
  { id: '18', title: 'K-Drama Essentials', subtitle: 'Korean series and limited romance thrillers' },
  { id: '9', title: 'Top Rated Series', subtitle: 'Critically acclaimed episodic storytelling' },
];

async function fetchCollection(id: string, page = 0): Promise<BrowseResponse & { title?: string }> {
  const cacheKey = `collection:${id}:${page}`;
  const cached = getCached<BrowseResponse>(cacheKey);
  if (cached) return cached;

  await loadGenres().catch(() => []);

  const virtualMeta = VIRTUAL_LANGUAGE_COLLECTIONS[id];
  if (virtualMeta) {
    const params = new URLSearchParams({
      page: String(page),
      type: virtualMeta.type,
      sort_by: 'date',
    });
    if (virtualMeta.lang === 'hindi') {
      params.set('dubbing', 'Hindi');
    } else {
      params.set('country', 'United States');
    }

    const raw = await fetchJson<{ results?: RawMediaRow[]; pager?: unknown }>(
      `${API_BASE_V3}/movies/list/filter?${params.toString()}`
    );
    const mapped = (raw.results || []).map(mapMediaItem).filter((item) => item.id);
    const results = filterByLanguage(mapped, virtualMeta.lang);
    const payload: BrowseResponse = {
      results,
      pager: mapPager(raw.pager, results.length),
    };
    setCached(cacheKey, payload, 5 * 60 * 1000);
    return payload;
  }

  const raw = await fetchJson<{ results?: RawMediaRow[]; pager?: unknown }>(
    `${API_BASE_V3}/tranding/list?page=${page}&id=${encodeURIComponent(id)}`
  );
  const results = (raw.results || []).map(mapMediaItem).filter((item) => item.id);
  const payload: BrowseResponse = {
    results,
    pager: mapPager(raw.pager, results.length),
  };
  setCached(cacheKey, payload, 5 * 60 * 1000);
  return payload;
}

async function fetchDetail(mediaType: MediaType, id: string): Promise<MediaDetail | null> {
  const cacheKey = `detail:${mediaType}:${id}`;
  const cached = getCached<MediaDetail>(cacheKey);
  if (cached) return cached;

  await loadGenres().catch(() => []);
  const primary = await fetchJson<{ results?: RawMediaRow[] }>(
    `${API_BASE_V3}/${mediaType}/${encodeURIComponent(id)}`
  );
  let row = primary.results?.[0];

  if (!row) {
    const altType: MediaType = mediaType === 'movie' ? 'tv' : 'movie';
    const fallback = await fetchJson<{ results?: RawMediaRow[] }>(
      `${API_BASE_V3}/${altType}/${encodeURIComponent(id)}`
    ).catch(() => ({ results: [] }));
    row = fallback.results?.[0];
  }

  if (!row) return null;
  const detail = mapMediaDetail(row);
  setCached(cacheKey, detail, 15 * 60 * 1000);
  return detail;
}

const app = express();
app.use(express.json());

app.get('/api/netmirror/genres', async (_req, res) => {
  try {
    const genres = await loadGenres();
    res.json({ genres });
  } catch (err) {
    res.status(502).json({ error: 'Unable to load genres from NetMirror API', details: String(err) });
  }
});

app.get('/api/netmirror/home', async (_req, res) => {
  try {
    const cached = getCached<HomeCatalogResponse>('home');
    if (cached) {
      res.json(cached);
      return;
    }

    const genres = await loadGenres().catch(() => [] as GenreItem[]);

    const [catalogProbe, ...collectionResponses] = await Promise.all([
      fetchJson<{ pager?: { total_results?: number } }>(
        `${API_BASE_V3}/movies/list/filter?page=0`
      ).catch(() => ({ pager: { total_results: 120548 } })),
      ...CURATED_COLLECTION_META.map((meta) =>
        fetchCollection(meta.id, 0).catch(() => ({
          results: [],
          pager: { currentPage: 0, itemsPerPage: 12, totalPages: 0, totalResults: 0 },
        }))
      ),
    ]);

    const collections: CuratedCollection[] = CURATED_COLLECTION_META.map((meta, idx) => ({
      id: meta.id,
      title: meta.title,
      subtitle: meta.subtitle,
      items: collectionResponses[idx]?.results || [],
      totalResults: collectionResponses[idx]?.pager.totalResults || 0,
    })).filter((c) => c.items.length > 0);

    // Pick a high-signal featured item (prefer one with description & trailer)
    const trendingItems = collections[0]?.items || [];
    let featured: MediaDetail | null = null;
    for (const candidate of trendingItems.slice(0, 4)) {
      const detail = await fetchDetail(candidate.mediaType, candidate.id).catch(() => null);
      if (detail) {
        featured = detail;
        if (detail.description && detail.description !== 'No synopsis available for this title yet.') {
          break;
        }
      }
    }

    const payload: HomeCatalogResponse = {
      featured,
      collections,
      genres,
      totalCatalogCount: Number(catalogProbe.pager?.total_results || 120548),
    };

    setCached('home', payload, 5 * 60 * 1000);
    res.json(payload);
  } catch (err) {
    res.status(502).json({ error: 'Failed to load NetMirror home catalog', details: String(err) });
  }
});

app.get('/api/netmirror/trending', async (req, res) => {
  try {
    const typeParam = String(req.query.type || 'all').toLowerCase();
    const filterType: 'all' | 'movie' | 'tv' =
      typeParam === 'movie' || typeParam === 'tv' ? typeParam : 'all';
    const cacheKey = `trending:${filterType}`;
    const cached = getCached<CuratedCollection>(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    const [page0, page1] = await Promise.all([
      fetchCollection('11', 0),
      fetchCollection('11', 1).catch(() => ({
        results: [] as MediaItem[],
        pager: { currentPage: 1, itemsPerPage: 12, totalPages: 1, totalResults: 0 },
      })),
    ]);

    const seen = new Set<string>();
    const combined: MediaItem[] = [];
    for (const item of [...page0.results, ...page1.results]) {
      if (!item.id || seen.has(item.id)) continue;
      seen.add(item.id);
      if (filterType === 'all' || item.mediaType === filterType) {
        combined.push(item);
      }
    }

    const payload: CuratedCollection = {
      id: '11',
      title: 'Trending Now',
      subtitle: 'Most popular movies and web series streaming right now',
      items: combined,
      totalResults: page0.pager.totalResults || combined.length,
    };

    setCached(cacheKey, payload, 5 * 60 * 1000);
    res.json(payload);
  } catch (err) {
    res.status(502).json({ error: 'Failed to load Trending Now collection', details: String(err) });
  }
});

app.get('/api/netmirror/collection/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const page = Math.max(0, Number(req.query.page || 0));
    const data = await fetchCollection(id, page);
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: 'Failed to load collection', details: String(err) });
  }
});

app.get('/api/netmirror/browse', async (req, res) => {
  try {
    await loadGenres().catch(() => []);
    const page = Math.max(0, Number(req.query.page || 0));
    const params = new URLSearchParams();
    params.set('page', String(page));

    const type = String(req.query.type || '');
    if (type === '1' || type === '2') {
      params.set('type', type);
    }

    const genreId = String(req.query.genreId || '').trim();
    if (genreId) {
      params.append('genre_ids[]', genreId);
    }

    const platform = String(req.query.platform || '').trim();
    if (platform) {
      params.set('platform', platform);
    }

    const dubbing = String(req.query.dubbing || '').trim();
    const country = String(req.query.country || '').trim();
    if (dubbing === 'English' && !country) {
      params.set('country', 'United States');
    } else {
      if (dubbing) {
        params.set('dubbing', dubbing);
      }
      if (country) {
        params.set('country', country);
      }
    }

    const sortBy = String(req.query.sortBy || 'date').trim();
    if (sortBy === 'date' || sortBy === 'created' || sortBy === 'rating') {
      params.set('sort_by', sortBy);
    }

    const raw = await fetchJson<{ results?: RawMediaRow[]; pager?: unknown }>(
      `${API_BASE_V3}/movies/list/filter?${params.toString()}`
    );
    let results = (raw.results || []).map(mapMediaItem).filter((item) => item.id);
    if (dubbing === 'Hindi') {
      results = filterByLanguage(results, 'hindi');
    } else if (dubbing === 'English') {
      results = filterByLanguage(results, 'english');
    }
    res.json({
      results,
      pager: mapPager(raw.pager, results.length),
    });
  } catch (err) {
    res.status(502).json({ error: 'Failed to browse catalog', details: String(err) });
  }
});

app.get('/api/netmirror/suggest', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) {
      res.json({ results: [] });
      return;
    }
    await loadGenres().catch(() => []);
    const raw = await fetchJson<{ results?: RawMediaRow[] }>(
      `${API_BASE_V4}/suggest.php?q=${encodeURIComponent(q)}&p=12`
    );
    const results = (raw.results || []).map(mapMediaItem).filter((item) => item.id);
    res.json({ results });
  } catch (err) {
    res.status(502).json({ error: 'Search suggestion failed', details: String(err) });
  }
});

app.get('/api/netmirror/search', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    const page = Math.max(0, Number(req.query.page || 0));
    const type = String(req.query.type || '').trim();
    if (!q) {
      res.json({
        results: [],
        pager: { currentPage: 0, itemsPerPage: 30, totalPages: 0, totalResults: 0 },
      });
      return;
    }

    await loadGenres().catch(() => []);
    const encodedQuery = encodeURIComponent(q.replace(/\//g, '--slash--'));
    const params = new URLSearchParams({ page: String(page), p: '12' });
    if (type === '1' || type === '2') {
      params.set('type', type);
    }

    const raw = await fetchJson<{ results?: RawMediaRow[]; pager?: unknown }>(
      `${API_BASE_V4}/api/search2/${encodedQuery}?${params.toString()}`
    );
    const results = (raw.results || []).map(mapMediaItem).filter((item) => item.id);
    res.json({
      results,
      pager: mapPager(raw.pager, results.length),
    });
  } catch (err) {
    res.status(502).json({ error: 'Search failed', details: String(err) });
  }
});

app.get('/api/netmirror/detail/:mediaType/:id', async (req, res) => {
  try {
    const mediaType: MediaType = req.params.mediaType === 'tv' ? 'tv' : 'movie';
    const { id } = req.params;

    const [detail, relatedRaw] = await Promise.all([
      fetchDetail(mediaType, id),
      fetchJson<{ results?: RawMediaRow[] }>(
        `${API_BASE_V4}/api/related/${encodeURIComponent(id)}?page=0`
      ).catch(() => ({ results: [] })),
    ]);

    if (!detail) {
      res.status(404).json({ error: 'Title not found in NetMirror catalog' });
      return;
    }

    let related = (relatedRaw.results || [])
      .map(mapMediaItem)
      .filter((item) => item.id && item.id !== id)
      .slice(0, 12);

    // Smart fallback when upstream related is empty: pull matching genre or collection titles
    if (related.length === 0) {
      const fallbackParams = new URLSearchParams({
        page: '0',
        type: detail.mediaType === 'tv' ? '2' : '1',
      });
      if (detail.genreIds[0]) {
        fallbackParams.append('genre_ids[]', detail.genreIds[0]);
      }
      const fallbackRaw = await fetchJson<{ results?: RawMediaRow[] }>(
        `${API_BASE_V3}/movies/list/filter?${fallbackParams.toString()}`
      ).catch(() => ({ results: [] }));
      related = (fallbackRaw.results || [])
        .map(mapMediaItem)
        .filter((item) => item.id && item.id !== id)
        .slice(0, 8);
    }

    res.json({ detail, related });
  } catch (err) {
    res.status(502).json({ error: 'Failed to fetch title details', details: String(err) });
  }
});

async function resolveAoneroomStreams(
  subjectId: string,
  mediaType: MediaType,
  se: number,
  ep: number
): Promise<{
  directStreams: Array<{ resolution: string; url: string; format: string; size?: string }>;
  subtitles: Array<{ lan: string; lanName: string; url: string }>;
}> {
  if (!subjectId) return { directStreams: [], subtitles: [] };
  const cacheKey = `aoneroom:${subjectId}:${mediaType}:${se}:${ep}`;
  const cached = getCached<{
    directStreams: Array<{ resolution: string; url: string; format: string; size?: string }>;
    subtitles: Array<{ lan: string; lanName: string; url: string }>;
  }>(cacheKey);
  if (cached) return cached;

  try {
    const detRes = await fetch(
      `https://h5.aoneroom.com/wefeed-h5-bff/web/subject/detail?subjectId=${encodeURIComponent(subjectId)}`,
      {
        headers: {
          ...REQUEST_HEADERS,
          Origin: 'https://h5.aoneroom.com',
          Referer: 'https://h5.aoneroom.com/',
        },
        signal: AbortSignal.timeout(2400),
      }
    );
    if (!detRes.ok) return { directStreams: [], subtitles: [] };
    const det = (await detRes.json()) as {
      data?: { subject?: { detailPath?: string } };
    };

    const dp = det.data?.subject?.detailPath || '';
    if (!dp) return { directStreams: [], subtitles: [] };

    const targetSe = mediaType === 'movie' ? 0 : se;
    const targetEp = mediaType === 'movie' ? 0 : ep;
    const headers = {
      ...REQUEST_HEADERS,
      Referer: `https://h5.aoneroom.com/spa/videoPlayPage/movies/${dp}?id=${encodeURIComponent(subjectId)}&type=/movie/detail`,
      Origin: 'https://h5.aoneroom.com',
      'X-Client-Info': JSON.stringify({ timezone: 'Asia/Kolkata' }),
    };

    const [playRes, dlRes] = await Promise.all([
      fetch(
        `https://h5.aoneroom.com/wefeed-h5-bff/web/subject/play?subjectId=${encodeURIComponent(subjectId)}&se=${targetSe}&ep=${targetEp}&detail_path=${encodeURIComponent(dp)}`,
        { headers, signal: AbortSignal.timeout(2400) }
      )
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch(
        `https://h5.aoneroom.com/wefeed-h5-bff/web/subject/download?subjectId=${encodeURIComponent(subjectId)}&se=${targetSe}&ep=${targetEp}&detail_path=${encodeURIComponent(dp)}`,
        { headers, signal: AbortSignal.timeout(2400) }
      )
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ]);

    const rawStreams: Array<{ url?: string; resolutions?: string; format?: string; size?: string }> =
      playRes?.data?.streams || [];
    const directStreams = rawStreams
      .filter((s) => Boolean(s.url))
      .map((s) => ({
        resolution: String(s.resolutions || 'HD'),
        url: String(s.url),
        format: String(s.format || 'MP4'),
        size: s.size ? String(s.size) : undefined,
      }))
      .sort((a, b) => Number(b.resolution) - Number(a.resolution));

    const rawCaptions: Array<{ lan?: string; lanName?: string; url?: string }> =
      dlRes?.data?.captions || [];
    const subtitles = rawCaptions
      .filter((c) => Boolean(c.url && c.lan))
      .slice(0, 10)
      .map((c) => ({
        lan: String(c.lan),
        lanName: String(c.lanName || c.lan),
        url: `/api/netmirror/subtitle?url=${encodeURIComponent(String(c.url))}`,
      }));

    const result = { directStreams, subtitles };
    setCached(cacheKey, result, 10 * 60 * 1000);
    return result;
  } catch {
    return { directStreams: [], subtitles: [] };
  }
}

app.get('/api/netmirror/subtitle', async (req, res) => {
  try {
    const rawUrl = String(req.query.url || '').trim();
    if (!rawUrl || !rawUrl.startsWith('https://')) {
      res.status(400).send('Invalid subtitle URL');
      return;
    }
    const r = await fetch(rawUrl, { signal: AbortSignal.timeout(6000) });
    if (!r.ok) {
      res.status(502).send('Subtitle unavailable');
      return;
    }
    const srt = await r.text();
    const vtt =
      'WEBVTT\n\n' +
      srt
        .replace(/\r\n/g, '\n')
        .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
    res.setHeader('Content-Type', 'text/vtt; charset=utf-8');
    res.send(vtt);
  } catch {
    res.status(502).send('Subtitle conversion failed');
  }
});

const VIDORA_FAST_KEY = 'f3b72e73c80c9a996574379798703796a1936efa3516a7105cb0e43048b46b5a';
const MOVIESAPI_KEY = '3a67e8866ae1d2bb9e81fe7f73315a56eb3bdf5e3e755c7554c8be6910aa6b13';

function isSafePublicHttpsUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '::1' ||
      host.startsWith('10.') ||
      host.startsWith('192.168.') ||
      host.startsWith('169.254.') ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

app.get('/api/netmirror/hls-proxy', async (req, res) => {
  try {
    const rawUrl = String(req.query.url || '').trim();
    const refType = String(req.query.ref || 'moviesapi');
    if (!isSafePublicHttpsUrl(rawUrl)) {
      res.status(400).send('Invalid stream URL');
      return;
    }

    const refOrigin =
      refType === 'yapgrid'
        ? 'https://yapgrid.com'
        : refType === 'vidprime'
          ? 'https://vidprime.top'
          : 'https://moviesapi.to';

    const headers: Record<string, string> = {
      'User-Agent': REQUEST_HEADERS['User-Agent'],
      Referer: `${refOrigin}/`,
      Origin: refOrigin,
    };
    if (req.headers.range) {
      headers.Range = String(req.headers.range);
    }

    const upstream = await fetch(rawUrl, {
      headers,
      signal: AbortSignal.timeout(10000),
    });

    if (!upstream.ok) {
      res.status(upstream.status).send('Upstream stream unavailable');
      return;
    }

    const contentType = upstream.headers.get('content-type') || '';
    const isLikelyPlaylist =
      /mpegurl|m3u8|text\/plain|application\/json|javascript/i.test(contentType) ||
      /\.m3u8(\?|$)/i.test(rawUrl) ||
      /\/cdn\/.*?\.(js|json)(\?|$)/i.test(rawUrl);

    if (isLikelyPlaylist) {
      const text = await upstream.text();
      if (text.trimStart().startsWith('#EXTM3U')) {
        const makeProxyUrl = (target: string) => {
          const abs = new URL(target, rawUrl).href;
          return `/api/netmirror/hls-proxy?ref=${encodeURIComponent(refType)}&url=${encodeURIComponent(abs)}`;
        };

        const rewritten = text
          .split(/\r?\n/)
          .map((line) => {
            const trimmed = line.trim();
            if (!trimmed) return line;
            if (trimmed.startsWith('#')) {
              return line.replace(/URI="([^"]+)"/g, (_m, uri) => `URI="${makeProxyUrl(uri)}"`);
            }
            return makeProxyUrl(trimmed);
          })
          .join('\n');

        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache');
        res.send(rewritten);
        return;
      }

      res.setHeader('Content-Type', contentType || 'application/octet-stream');
      res.send(Buffer.from(text));
      return;
    }

    const buf = Buffer.from(await upstream.arrayBuffer());
    if (contentType) res.setHeader('Content-Type', contentType);
    const acceptRanges = upstream.headers.get('accept-ranges');
    if (acceptRanges) res.setHeader('Accept-Ranges', acceptRanges);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.status(upstream.status).send(buf);
  } catch {
    res.status(502).send('HLS proxy error');
  }
});

async function resolveVidsparkFastHls(
  mediaType: MediaType,
  tmdbId: string,
  se: number,
  ep: number
): Promise<string | undefined> {
  if (!tmdbId) return undefined;
  const cacheKey = `vidspark-hls:${mediaType}:${tmdbId}:${se}:${ep}`;
  const cached = getCached<string | null>(cacheKey);
  if (cached !== null) return cached || undefined;

  const encodedId = encodeURIComponent(tmdbId);
  const pathSuffix =
    mediaType === 'tv' ? `tv/${encodedId}/${se}/${ep}` : `movie/${encodedId}`;

  try {
    const res = await fetch(`https://moviesapi.to/api/vidora/v1/${pathSuffix}`, {
      headers: {
        'User-Agent': REQUEST_HEADERS['User-Agent'],
        'x-player-key': MOVIESAPI_KEY,
        Referer: 'https://moviesapi.to/',
        Origin: 'https://moviesapi.to',
      },
      signal: AbortSignal.timeout(2800),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = (await res.json()) as {
      result?: boolean;
      sources?: Array<{ url?: string }>;
    };
    const streamUrl = json?.sources?.[0]?.url || '';
    if (!streamUrl || !/\.m3u8/i.test(streamUrl)) {
      throw new Error('No HLS stream');
    }
    const proxied = `/api/netmirror/hls-proxy?ref=moviesapi&url=${encodeURIComponent(streamUrl)}`;
    setCached(cacheKey, proxied, 15 * 60 * 1000);
    return proxied;
  } catch {
    setCached(cacheKey, '', 15 * 1000);
    return undefined;
  }
}

async function resolveVidprimeFastHls(
  mediaType: MediaType,
  tmdbId: string,
  se: number,
  ep: number
): Promise<string | undefined> {
  if (!tmdbId) return undefined;
  const cacheKey = `vidprime-hls:${mediaType}:${tmdbId}:${se}:${ep}`;
  const cached = getCached<string | null>(cacheKey);
  if (cached !== null) return cached || undefined;

  const encodedId = encodeURIComponent(tmdbId);
  const pathSuffix =
    mediaType === 'tv' ? `tv/${encodedId}/${se}/${ep}` : `movie/${encodedId}`;

  const endpoints = [
    {
      url: `https://cdn.vidspark.to/api/vidora/v1/${pathSuffix}`,
      origin: 'https://cdn.vidspark.to',
    },
    {
      url: `https://vidprime.top/api/vidora/v1/${pathSuffix}?source=vjej`,
      origin: 'https://vidprime.top',
    },
  ];

  try {
    const hlsUrl = await Promise.any(
      endpoints.map(async ({ url, origin }) => {
        const res = await fetch(url, {
          headers: {
            'User-Agent': REQUEST_HEADERS['User-Agent'],
            'x-player-key': VIDORA_FAST_KEY,
            Referer: `${origin}/`,
            Origin: origin,
          },
          signal: AbortSignal.timeout(2800),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as {
          result?: boolean;
          sources?: Array<{ url?: string }>;
        };
        const streamUrl = json?.sources?.[0]?.url || '';
        if (!streamUrl || !/\.m3u8/i.test(streamUrl) || streamUrl.includes('flixcdn.cyou')) {
          throw new Error('No CORS HLS stream');
        }
        return streamUrl;
      })
    );
    setCached(cacheKey, hlsUrl, 15 * 60 * 1000);
    return hlsUrl;
  } catch {
    setCached(cacheKey, '', 15 * 1000);
    return undefined;
  }
}

async function resolveYapgridFastHls(
  mediaType: MediaType,
  tmdbId: string,
  se: number,
  ep: number
): Promise<string | undefined> {
  if (!tmdbId) return undefined;
  const cacheKey = `yapgrid-hls:${mediaType}:${tmdbId}:${se}:${ep}`;
  const cached = getCached<string | null>(cacheKey);
  if (cached !== null) return cached || undefined;

  const qs =
    mediaType === 'tv'
      ? `tmdb=${encodeURIComponent(tmdbId)}&type=tv&season=${se}&episode=${ep}`
      : `tmdb=${encodeURIComponent(tmdbId)}&type=movie`;

  const endpoints = [
    `https://play.yapgrid.com/vix/resolve?${qs}`,
    `https://play.yapgrid.com/arc/resolve?${qs}`,
  ];

  try {
    const hlsUrl = await Promise.any(
      endpoints.map(async (url) => {
        const res = await fetch(url, {
          headers: {
            'User-Agent': REQUEST_HEADERS['User-Agent'],
            Referer: 'https://yapgrid.com/',
            Origin: 'https://yapgrid.com',
          },
          signal: AbortSignal.timeout(2800),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as {
          ok?: boolean;
          sources?: Array<{ url?: string }>;
        };
        const streamUrl = json?.sources?.[0]?.url || '';
        if (!json?.ok || !streamUrl) throw new Error('No YapGrid stream');
        return streamUrl;
      })
    );
    setCached(cacheKey, hlsUrl, 15 * 60 * 1000);
    return hlsUrl;
  } catch {
    setCached(cacheKey, '', 15 * 1000);
    return undefined;
  }
}

app.get('/api/netmirror/stream', async (req, res) => {
  try {
    const id = String(req.query.id || '').trim();
    const mediaType: MediaType = req.query.mediaType === 'tv' ? 'tv' : 'movie';
    const se = Math.max(1, Number(req.query.se || 1));
    const ep = Math.max(1, Number(req.query.ep || 1));
    let tmdbId = String(req.query.tmdbId || '').trim();
    let subjectId = String(req.query.subjectId || '').trim();
    let titleQuery = String(req.query.title || '').trim();

    if ((!tmdbId || !subjectId || !titleQuery) && id) {
      const detail = await fetchDetail(mediaType, id).catch(() => null);
      if (detail) {
        if (!tmdbId && detail.tmdbId) tmdbId = detail.tmdbId;
        if (!subjectId && detail.subjectId) subjectId = detail.subjectId;
        if (!titleQuery && detail.title) titleQuery = detail.title;
      }
    }

    if (!tmdbId && titleQuery) {
      const cleanTitle = titleQuery
        .replace(/\[.*?\]/g, '')
        .replace(/\(20\d{2}\)/g, '')
        .replace(/\bS\d+(-S\d+)?\b/gi, '')
        .replace(/\bSeason\s*\d+\b/gi, '')
        .replace(/\bHindi\s*Dubbed\b/gi, '')
        .trim();
      const suggest = await fetchJson<{ results?: Array<{ id?: string | number; media_type?: string }> }>(
        `${API_BASE_V4}/suggest.php?q=${encodeURIComponent(cleanTitle)}&p=12`
      ).catch(() => ({ results: [] }));
      const matched =
        suggest.results?.find((r) => normalizeMediaType(r.media_type) === mediaType) ||
        suggest.results?.[0];
      if (matched?.id) {
        tmdbId = String(matched.id);
      }
    }

    const encodedId = tmdbId ? encodeURIComponent(tmdbId) : '';
    const isHindiTitle = /\[hindi\]|\bhindi\b/i.test(titleQuery);
    const vidsyncEmbedUrl = tmdbId
      ? mediaType === 'tv'
        ? `https://vidsync.pro/embed/tv/${encodedId}/${se}/${ep}?primarycolor=e11d48${isHindiTitle ? '&dubLang=hindi' : ''}`
        : `https://vidsync.pro/embed/movie/${encodedId}?primarycolor=e11d48${isHindiTitle ? '&dubLang=hindi' : ''}`
      : '';

    const servers = vidsyncEmbedUrl
      ? [
          {
            id: 'vidsync',
            name: 'Server 1 · VidSync HD',
            quality: 'Multi-Lang HD',
            embedUrl: vidsyncEmbedUrl,
          },
        ]
      : [];

    if (servers.length === 0) {
      res.status(404).json({ error: 'No streaming server available for this title.' });
      return;
    }

    res.json({
      tmdbId,
      subjectId,
      mediaType,
      season: se,
      episode: ep,
      directStreams: [],
      subtitles: [],
      servers,
    });
  } catch (err) {
    res.status(502).json({ error: 'Failed to initialize streaming servers', details: String(err) });
  }
});

async function startServer() {
  const PORT = 3000;

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`NetMirror catalog server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
