import { ChevronLeft, ChevronRight, Flame } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { fetchTrendingNow } from '../lib/api';
import type { CuratedCollection, MediaItem } from '../types/media';
import { MediaCard } from './MediaCard';

type TrendingFilter = 'all' | 'movie' | 'tv';

interface TrendingNowRowProps {
  watchlistIds: Set<string>;
  onSelectItem: (item: MediaItem) => void;
  onToggleWatchlist: (item: MediaItem) => void;
  onViewAll: (collection: CuratedCollection) => void;
}

const FILTER_OPTIONS: Array<{ value: TrendingFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'movie', label: 'Movies' },
  { value: 'tv', label: 'Web Series' },
];

export function TrendingNowRow({
  watchlistIds,
  onSelectItem,
  onToggleWatchlist,
  onViewAll,
}: TrendingNowRowProps) {
  const [filter, setFilter] = useState<TrendingFilter>('all');
  const [collection, setCollection] = useState<CuratedCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchTrendingNow(filter)
      .then((data) => {
        if (!cancelled) {
          setCollection(data);
          scrollerRef.current?.scrollTo({ left: 0, behavior: 'auto' });
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load Trending Now titles.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [filter, reloadTick]);

  const scrollRow = (direction: 'left' | 'right') => {
    const el = scrollerRef.current;
    if (!el) return;
    const distance = Math.max(320, el.clientWidth * 0.78);
    el.scrollBy({
      left: direction === 'left' ? -distance : distance,
      behavior: 'smooth',
    });
  };

  const items = collection?.items || [];

  return (
    <section aria-label="Trending Now" className="py-6 sm:py-8">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-12">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-rose-500 shrink-0" aria-hidden="true" />
              <h2 className="font-display text-xl sm:text-2xl font-semibold tracking-tight text-white">
                Trending Now
              </h2>
            </div>
            <p className="mt-1 text-sm text-zinc-400">
              {collection?.subtitle || 'Most popular movies and web series streaming right now'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Media type filter tabs */}
            <div
              role="group"
              aria-label="Filter Trending Now by format"
              className="inline-flex items-center rounded-lg border border-white/10 bg-[#141418] p-1"
            >
              {FILTER_OPTIONS.map((opt) => {
                const active = filter === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setFilter(opt.value)}
                    className={`min-h-[32px] rounded-md px-3 text-xs font-medium transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 ${
                      active
                        ? 'bg-rose-600 text-white'
                        : 'text-zinc-300 hover:bg-white/6 hover:text-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            <div className="hidden sm:flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => scrollRow('left')}
                aria-label="Scroll Trending Now left"
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-[#141418] text-zinc-300 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => scrollRow('right')}
                aria-label="Scroll Trending Now right"
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-[#141418] text-zinc-300 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {collection && (
              <button
                type="button"
                onClick={() => onViewAll(collection)}
                className="inline-flex min-h-[40px] items-center rounded-lg border border-white/10 bg-[#141418] px-3.5 text-xs font-medium text-zinc-200 transition-colors hover:border-rose-500/50 hover:text-white whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
              >
                View All ({collection.totalResults.toLocaleString()})
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="no-scrollbar flex gap-4 overflow-x-auto pb-2">
            {Array.from({ length: 7 }).map((_, idx) => (
              <div key={idx} className="w-[160px] sm:w-[190px] lg:w-[210px] shrink-0 space-y-2.5">
                <div className="aspect-[3/4] w-full animate-pulse rounded-xl bg-[#141418]" />
                <div className="h-4 w-3/4 animate-pulse rounded bg-[#141418]" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-[#141418]" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-rose-500/30 bg-rose-950/20 px-5 py-4">
            <p className="text-sm text-rose-200">{error}</p>
            <button
              type="button"
              onClick={() => setReloadTick((n) => n + 1)}
              className="inline-flex min-h-[36px] items-center rounded-lg bg-rose-600 px-3.5 text-xs font-semibold text-white hover:bg-rose-500 shrink-0"
            >
              Retry
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-white/8 bg-[#141418] px-5 py-6 text-sm text-zinc-400">
            No trending titles matched this filter.
          </div>
        ) : (
          <div
            ref={scrollerRef}
            className="no-scrollbar flex gap-4 overflow-x-auto pb-2 scroll-smooth snap-x snap-mandatory"
          >
            {items.map((item, idx) => (
              <div
                key={`trending-${filter}-${item.id}-${idx}`}
                className="relative w-[160px] sm:w-[190px] lg:w-[210px] shrink-0 snap-start"
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute top-2.5 left-2.5 z-10 rounded-md border border-white/15 bg-black/75 px-2 py-0.5 font-mono text-xs font-semibold text-white tabular-nums backdrop-blur-sm"
                >
                  #{String(idx + 1).padStart(2, '0')}
                </span>
                <MediaCard
                  item={item}
                  isSaved={watchlistIds.has(item.id)}
                  onSelect={onSelectItem}
                  onToggleWatchlist={onToggleWatchlist}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
