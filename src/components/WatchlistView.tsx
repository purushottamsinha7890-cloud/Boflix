import { Bookmark, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { MediaItem } from '../types/media';
import { MediaCard } from './MediaCard';

interface WatchlistViewProps {
  items: MediaItem[];
  watchlistIds: Set<string>;
  onSelectItem: (item: MediaItem) => void;
  onToggleWatchlist: (item: MediaItem) => void;
  onClearAll: () => void;
  onBrowseCatalog: () => void;
}

export function WatchlistView({
  items,
  watchlistIds,
  onSelectItem,
  onToggleWatchlist,
  onClearAll,
  onBrowseCatalog,
}: WatchlistViewProps) {
  const [filter, setFilter] = useState<'all' | 'movie' | 'tv'>('all');

  const filteredItems = items.filter((item) =>
    filter === 'all' ? true : item.mediaType === filter
  );

  return (
    <section className="py-8 sm:py-10 min-h-[70vh]">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-12">
        <div className="flex flex-col gap-4 border-b border-white/8 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Your Watchlist
            </h1>
            <p className="mt-1.5 text-sm text-zinc-400">
              Saved movies and web series persisted locally in your browser.
            </p>
          </div>

          {items.length > 0 && (
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-1 rounded-lg border border-white/8 bg-[#141418] p-1">
                {[
                  { label: 'All', value: 'all' as const },
                  { label: 'Movies', value: 'movie' as const },
                  { label: 'Web Series', value: 'tv' as const },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFilter(opt.value)}
                    className={`min-h-[36px] rounded-md px-3 text-xs font-medium whitespace-nowrap transition-colors ${
                      filter === opt.value
                        ? 'bg-rose-600 text-white'
                        : 'text-zinc-400 hover:text-zinc-100'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={onClearAll}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-white/10 bg-[#141418] px-3.5 text-xs font-medium text-zinc-300 hover:border-rose-500/50 hover:text-rose-300"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Clear Watchlist</span>
              </button>
            </div>
          )}
        </div>

        {items.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-white/8 bg-[#141418] p-12 text-center">
            <Bookmark className="mx-auto h-8 w-8 text-zinc-500" aria-hidden="true" />
            <h2 className="mt-4 font-display text-lg font-semibold text-white">
              Your watchlist is empty
            </h2>
            <p className="mt-1.5 text-sm text-zinc-400 max-w-md mx-auto">
              Bookmark any movie or web series card across Trending, Movies, or Explore to build your queue.
            </p>
            <button
              type="button"
              onClick={onBrowseCatalog}
              className="mt-6 inline-flex min-h-[44px] items-center rounded-lg bg-rose-600 px-5 text-sm font-semibold text-white hover:bg-rose-500"
            >
              Explore Catalog
            </button>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="mt-10 rounded-xl border border-white/8 bg-[#141418] p-10 text-center">
            <p className="text-sm text-zinc-400">
              No {filter === 'tv' ? 'web series' : 'movies'} in your saved watchlist yet.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {filteredItems.map((item) => (
              <MediaCard
                key={`wl-${item.id}`}
                item={item}
                isSaved={watchlistIds.has(item.id)}
                onSelect={onSelectItem}
                onToggleWatchlist={onToggleWatchlist}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
