import { Bookmark, Check } from 'lucide-react';
import { prefetchTitle } from '../lib/api';
import type { MediaItem } from '../types/media';
import { MediaImage } from './MediaImage';

interface MediaCardProps {
  item: MediaItem;
  isSaved: boolean;
  onSelect: (item: MediaItem) => void;
  onToggleWatchlist: (item: MediaItem) => void;
}

export function MediaCard({ item, isSaved, onSelect, onToggleWatchlist }: MediaCardProps) {
  const typeLabel = item.mediaType === 'tv' ? 'Series' : 'Movie';
  const metaItems = [
    typeLabel,
    item.releaseYear,
    item.voteAverage !== '—' ? `${item.voteAverage}` : null,
  ].filter(Boolean);

  return (
    <article
      onMouseEnter={() => prefetchTitle(item)}
      onPointerDown={() => prefetchTitle(item)}
      className="group relative flex flex-col"
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl border border-white/10 bg-[#141418] transition-transform duration-200 ease-out group-hover:-translate-y-1">
        <button
          type="button"
          onClick={() => onSelect(item)}
          className="block h-full w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
          aria-label={`Play ${item.title}`}
        >
          <MediaImage
            src={item.backdropPath}
            alt={item.title}
            mediaType={item.mediaType}
            variant="poster"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent"
          />
        </button>

        {/* Quick watchlist toggle */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleWatchlist(item);
          }}
          aria-label={isSaved ? `Remove ${item.title} from watchlist` : `Save ${item.title} to watchlist`}
          className={`absolute top-2.5 right-2.5 inline-flex h-10 w-10 items-center justify-center rounded-lg border transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 ${
            isSaved
              ? 'border-rose-500/60 bg-rose-600/90 text-white'
              : 'border-white/15 bg-black/65 text-zinc-200 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100 hover:bg-black/85'
          }`}
        >
          {isSaved ? <Check className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
        </button>

        {/* Bottom rating overlay */}
        {item.voteAverage !== '—' && (
          <span className="pointer-events-none absolute bottom-2.5 left-3 font-mono text-xs font-semibold text-amber-300 tabular-nums">
            {item.voteAverage} IMDb
          </span>
        )}
      </div>

      {/* Unboxed title & metadata below poster */}
      <div className="mt-2.5 px-0.5">
        <button
          type="button"
          onClick={() => onSelect(item)}
          className="text-left font-display text-sm font-semibold text-zinc-100 hover:text-rose-400 transition-colors line-clamp-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 rounded"
        >
          {item.title}
        </button>

        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-zinc-400 font-mono tabular-nums truncate">
          {metaItems.map((meta, idx) => (
            <span key={`${meta}-${idx}`} className="inline-flex items-center gap-1.5">
              {idx > 0 && (
                <span aria-hidden="true" className="text-zinc-600">
                  ·
                </span>
              )}
              <span>{meta}</span>
            </span>
          ))}
          {item.country && (
            <span className="inline-flex items-center gap-1.5 truncate font-sans">
              <span aria-hidden="true" className="text-zinc-600">
                ·
              </span>
              <span className="truncate">{item.country}</span>
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
