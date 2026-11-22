import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRef } from 'react';
import type { CuratedCollection, MediaItem } from '../types/media';
import { MediaCard } from './MediaCard';

interface CollectionRowProps {
  collection: CuratedCollection;
  watchlistIds: Set<string>;
  onSelectItem: (item: MediaItem) => void;
  onToggleWatchlist: (item: MediaItem) => void;
  onViewAll: (collection: CuratedCollection) => void;
}

export function CollectionRow({
  collection,
  watchlistIds,
  onSelectItem,
  onToggleWatchlist,
  onViewAll,
}: CollectionRowProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  const scrollRow = (direction: 'left' | 'right') => {
    const el = scrollerRef.current;
    if (!el) return;
    const distance = Math.max(320, el.clientWidth * 0.78);
    el.scrollBy({
      left: direction === 'left' ? -distance : distance,
      behavior: 'smooth',
    });
  };

  return (
    <section className="py-6 sm:py-8">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-12">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-xl sm:text-2xl font-semibold tracking-tight text-white">
              {collection.title}
            </h2>
            <p className="mt-1 text-sm text-zinc-400">{collection.subtitle}</p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => scrollRow('left')}
                aria-label={`Scroll ${collection.title} left`}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-[#141418] text-zinc-300 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => scrollRow('right')}
                aria-label={`Scroll ${collection.title} right`}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-[#141418] text-zinc-300 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => onViewAll(collection)}
              className="inline-flex min-h-[40px] items-center rounded-lg border border-white/10 bg-[#141418] px-3.5 text-xs font-medium text-zinc-200 transition-colors hover:border-rose-500/50 hover:text-white whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
            >
              View All ({collection.totalResults.toLocaleString()})
            </button>
          </div>
        </div>

        <div
          ref={scrollerRef}
          className="no-scrollbar flex gap-4 overflow-x-auto pb-2 scroll-smooth snap-x snap-mandatory"
        >
          {collection.items.map((item, idx) => (
            <div
              key={`${collection.id}-${item.id}-${idx}`}
              className="w-[160px] sm:w-[190px] lg:w-[210px] shrink-0 snap-start"
            >
              <MediaCard
                item={item}
                isSaved={watchlistIds.has(item.id)}
                onSelect={onSelectItem}
                onToggleWatchlist={onToggleWatchlist}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
