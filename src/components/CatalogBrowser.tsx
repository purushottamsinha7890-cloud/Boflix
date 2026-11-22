import { ArrowLeft, RotateCcw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { browseCatalog, fetchCollection } from '../lib/api';
import {
  COUNTRY_OPTIONS,
  DUBBING_OPTIONS,
  SORT_OPTIONS,
  STREAMING_PLATFORMS,
} from '../lib/constants';
import type {
  BrowseFilters,
  CuratedCollection,
  GenreItem,
  MediaItem,
  PagerInfo,
} from '../types/media';
import { MediaCard } from './MediaCard';

interface CatalogBrowserProps {
  mode: 'movies' | 'series' | 'explore' | 'collection';
  activeCollection: CuratedCollection | null;
  genres: GenreItem[];
  initialFilters?: BrowseFilters | null;
  filterSeed?: number;
  watchlistIds: Set<string>;
  onSelectItem: (item: MediaItem) => void;
  onToggleWatchlist: (item: MediaItem) => void;
  onExitCollection?: () => void;
}

export function CatalogBrowser({
  mode,
  activeCollection,
  genres,
  initialFilters,
  filterSeed = 0,
  watchlistIds,
  onSelectItem,
  onToggleWatchlist,
  onExitCollection,
}: CatalogBrowserProps) {
  const lockedType: 'all' | '1' | '2' | undefined =
    mode === 'movies' ? '1' : mode === 'series' ? '2' : undefined;

  const [typeFilter, setTypeFilter] = useState<'all' | '1' | '2'>(
    lockedType || initialFilters?.type || 'all'
  );
  const [genreId, setGenreId] = useState(initialFilters?.genreId || '');
  const [platform, setPlatform] = useState(initialFilters?.platform || '');
  const [dubbing, setDubbing] = useState(initialFilters?.dubbing || '');
  const [country, setCountry] = useState(initialFilters?.country || '');
  const [sortBy, setSortBy] = useState<'date' | 'created' | 'rating'>(
    initialFilters?.sortBy || 'date'
  );
  const [page, setPage] = useState(0);

  const [items, setItems] = useState<MediaItem[]>([]);
  const [pager, setPager] = useState<PagerInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTypeFilter(lockedType || initialFilters?.type || 'all');
    if (filterSeed > 0 && initialFilters) {
      setGenreId(initialFilters.genreId || '');
      setPlatform(initialFilters.platform || '');
      setDubbing(initialFilters.dubbing || '');
      setCountry(initialFilters.country || '');
      setSortBy(initialFilters.sortBy || 'date');
    } else if (!initialFilters) {
      setGenreId('');
      setPlatform('');
      setDubbing('');
      setCountry('');
      setSortBy('date');
    }
    setPage(0);
  }, [mode, lockedType, activeCollection?.id, filterSeed, initialFilters]);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      if (page === 0) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);

      try {
        const res =
          mode === 'collection' && activeCollection
            ? await fetchCollection(activeCollection.id, page)
            : await browseCatalog({
                page,
                type: lockedType || typeFilter,
                genreId,
                platform,
                dubbing,
                country,
                sortBy,
              } satisfies BrowseFilters);

        if (cancelled) return;
        setPager(res.pager);
        setItems((prev) => (page === 0 ? res.results : [...prev, ...res.results]));
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load catalog titles.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    }

    loadData();
    return () => {
      cancelled = true;
    };
  }, [mode, activeCollection?.id, lockedType, typeFilter, genreId, platform, dubbing, country, sortBy, page]);

  const resetFilters = () => {
    setTypeFilter(lockedType || 'all');
    setGenreId('');
    setPlatform('');
    setDubbing('');
    setCountry('');
    setSortBy('date');
    setPage(0);
  };

  const applyFilterChange = (updater: () => void) => {
    updater();
    setPage(0);
  };

  const headingTitle =
    mode === 'collection' && activeCollection
      ? activeCollection.title
      : mode === 'movies'
        ? 'Movies Catalog'
        : mode === 'series'
          ? 'Web Series Catalog'
          : 'Explore Full Catalog';

  const headingSubtitle =
    mode === 'collection' && activeCollection
      ? activeCollection.subtitle
      : mode === 'movies'
        ? 'Theatrical features, international cinema, and regional premieres'
        : mode === 'series'
          ? 'Multi-season dramas, documentaries, and limited series'
          : 'Filter across genres, streaming networks, languages, and regions';

  const hasActiveFilters =
    (!lockedType && typeFilter !== 'all') ||
    genreId !== '' ||
    platform !== '' ||
    dubbing !== '' ||
    country !== '' ||
    sortBy !== 'date';

  const hasMorePages = pager ? page + 1 < pager.totalPages : false;

  return (
    <section className="py-8 sm:py-10 min-h-[70vh]">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-12">
        {/* Section Header */}
        <div className="flex flex-col gap-4 border-b border-white/8 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            {mode === 'collection' && onExitCollection && (
              <button
                type="button"
                onClick={onExitCollection}
                className="mb-3 inline-flex min-h-[36px] items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back to Home</span>
              </button>
            )}
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white">
              {headingTitle}
            </h1>
            <p className="mt-1.5 text-sm text-zinc-400">{headingSubtitle}</p>
          </div>

          {pager && (
            <p className="font-mono text-xs text-zinc-400 tabular-nums shrink-0">
              {pager.totalResults.toLocaleString()} titles matched
            </p>
          )}
        </div>

        {/* Filter Toolbar (only for non-collection catalog browsing) */}
        {mode !== 'collection' && (
          <div className="mt-6 space-y-4 rounded-xl border border-white/8 bg-[#141418] p-4 sm:p-5">
            {/* Top row: Type segmented control & Platform tabs */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              {!lockedType && (
                <div className="inline-flex items-center gap-1 rounded-lg bg-[#09090B] p-1 border border-white/8 self-start">
                  {[
                    { label: 'All Titles', value: 'all' as const },
                    { label: 'Movies', value: '1' as const },
                    { label: 'Web Series', value: '2' as const },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => applyFilterChange(() => setTypeFilter(opt.value))}
                      className={`min-h-[36px] rounded-md px-3.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                        typeFilter === opt.value
                          ? 'bg-rose-600 text-white'
                          : 'text-zinc-400 hover:text-zinc-100'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}

              {/* OTT Network selector */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 lg:pb-0">
                {STREAMING_PLATFORMS.map((plat) => (
                  <button
                    key={plat.value || 'all'}
                    type="button"
                    onClick={() => applyFilterChange(() => setPlatform(plat.value))}
                    className={`min-h-[36px] rounded-lg px-3 text-xs font-medium whitespace-nowrap shrink-0 border transition-colors ${
                      platform === plat.value
                        ? 'border-rose-500/60 bg-rose-600/15 text-rose-200'
                        : 'border-white/8 bg-[#09090B] text-zinc-400 hover:text-zinc-100 hover:border-white/20'
                    }`}
                  >
                    {plat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Language Partition Bar (Hindi / English / Regional) */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar border-t border-white/8 pt-3">
              <span className="text-xs font-medium text-zinc-400 mr-1 shrink-0">Language:</span>
              {DUBBING_OPTIONS.map((opt) => (
                <button
                  key={opt.value || 'all-lang'}
                  type="button"
                  onClick={() => applyFilterChange(() => setDubbing(opt.value))}
                  className={`min-h-[34px] rounded-lg px-3 text-xs font-medium whitespace-nowrap shrink-0 border transition-colors ${
                    dubbing === opt.value
                      ? 'border-rose-500/60 bg-rose-600 text-white'
                      : 'border-white/8 bg-[#09090B] text-zinc-300 hover:text-white hover:border-white/20'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Bottom row: Select dropdowns */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <div>
                <label htmlFor="filter-genre" className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Genre
                </label>
                <select
                  id="filter-genre"
                  value={genreId}
                  onChange={(e) => applyFilterChange(() => setGenreId(e.target.value))}
                  className="h-10 w-full rounded-lg border border-white/10 bg-[#09090B] px-3 text-sm text-zinc-100 focus:border-rose-500 focus:outline-none"
                >
                  <option value="">All Genres ({genres.length || 40})</option>
                  {genres.map((g) => (
                    <option key={g.tid} value={g.tid}>
                      {g.name} ({g.count.toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="filter-dubbing" className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Audio / Dubbing
                </label>
                <select
                  id="filter-dubbing"
                  value={dubbing}
                  onChange={(e) => applyFilterChange(() => setDubbing(e.target.value))}
                  className="h-10 w-full rounded-lg border border-white/10 bg-[#09090B] px-3 text-sm text-zinc-100 focus:border-rose-500 focus:outline-none"
                >
                  {DUBBING_OPTIONS.map((opt) => (
                    <option key={opt.value || 'all'} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="filter-country" className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Country / Region
                </label>
                <select
                  id="filter-country"
                  value={country}
                  onChange={(e) => applyFilterChange(() => setCountry(e.target.value))}
                  className="h-10 w-full rounded-lg border border-white/10 bg-[#09090B] px-3 text-sm text-zinc-100 focus:border-rose-500 focus:outline-none"
                >
                  {COUNTRY_OPTIONS.map((opt) => (
                    <option key={opt.value || 'all'} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="filter-sort" className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Sort Order
                </label>
                <select
                  id="filter-sort"
                  value={sortBy}
                  onChange={(e) =>
                    applyFilterChange(() => setSortBy(e.target.value as 'date' | 'created' | 'rating'))
                  }
                  className="h-10 w-full rounded-lg border border-white/10 bg-[#09090B] px-3 text-sm text-zinc-100 focus:border-rose-500 focus:outline-none"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  disabled={!hasActiveFilters}
                  onClick={resetFilters}
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-[#09090B] px-3 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/5 disabled:opacity-40 disabled:pointer-events-none"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Reset Filters</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Results Grid */}
        {loading ? (
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="space-y-2.5">
                <div className="aspect-[3/4] w-full animate-pulse rounded-xl bg-zinc-900" />
                <div className="h-4 w-3/4 animate-pulse rounded bg-zinc-900" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-zinc-900" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="mt-10 rounded-xl border border-rose-500/30 bg-rose-950/20 p-8 text-center">
            <p className="text-sm font-medium text-rose-200">{error}</p>
            <button
              type="button"
              onClick={() => setPage(0)}
              className="mt-4 inline-flex min-h-[40px] items-center rounded-lg bg-rose-600 px-4 text-xs font-semibold text-white hover:bg-rose-500"
            >
              Retry Request
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="mt-10 rounded-xl border border-white/8 bg-[#141418] p-12 text-center">
            <p className="font-display text-lg font-semibold text-white">No matching titles found</p>
            <p className="mt-1 text-sm text-zinc-400">
              Try broadening your genre, region, or audio language filter.
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="mt-5 inline-flex min-h-[40px] items-center rounded-lg bg-rose-600 px-4 text-xs font-semibold text-white hover:bg-rose-500"
              >
                Clear All Filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {items.map((item, idx) => (
                <MediaCard
                  key={`${item.mediaType}-${item.id}-${idx}`}
                  item={item}
                  isSaved={watchlistIds.has(item.id)}
                  onSelect={onSelectItem}
                  onToggleWatchlist={onToggleWatchlist}
                />
              ))}
            </div>

            {hasMorePages && (
              <div className="mt-10 flex justify-center">
                <button
                  type="button"
                  disabled={loadingMore}
                  onClick={() => setPage((p) => p + 1)}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-white/12 bg-[#141418] px-6 text-sm font-medium text-zinc-100 transition-colors hover:border-rose-500/60 hover:bg-white/5 disabled:opacity-50"
                >
                  {loadingMore ? 'Loading more titles...' : 'Load More Titles'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
