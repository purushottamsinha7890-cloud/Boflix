import { Bookmark, Check, Play } from 'lucide-react';
import { prefetchTitle } from '../lib/api';
import { GENERATED_ASSETS } from '../lib/constants';
import type { MediaDetail, MediaItem } from '../types/media';
import { MediaImage } from './MediaImage';

interface HeroSpotlightProps {
  featured: MediaDetail | null;
  totalCatalogCount: number;
  genreCount: number;
  collectionCount: number;
  isSaved: boolean;
  onOpenDetail: (item: MediaItem) => void;
  onToggleWatchlist: (item: MediaItem) => void;
}

export function HeroSpotlight({
  featured,
  totalCatalogCount,
  genreCount,
  collectionCount,
  isSaved,
  onOpenDetail,
  onToggleWatchlist,
}: HeroSpotlightProps) {
  const title = featured?.title || 'Curated Cinema & Prestige Web Series';
  const typeLabel = featured?.mediaType === 'tv' ? 'Web Series' : 'Feature Film';
  const metadataParts = [
    typeLabel,
    featured?.releaseYear,
    featured?.country,
    featured?.voteAverage && featured.voteAverage !== '—' ? `${featured.voteAverage} IMDb` : null,
    featured?.genres?.slice(0, 2).join(' / '),
  ].filter(Boolean);

  return (
    <section aria-label="Featured spotlight" className="border-b border-white/8 bg-[#09090B]">
      <div className="mx-auto max-w-[1440px] px-4 pt-6 pb-8 sm:px-8 lg:px-12 lg:pt-8 lg:pb-10">
        {/* Dominant focal hero frame */}
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#141418]">
          <div className="grid lg:grid-cols-12 items-stretch min-h-[420px] lg:min-h-[480px]">
            {/* Left content column */}
            <div className="relative z-10 flex flex-col justify-end p-6 sm:p-10 lg:col-span-6 lg:p-12 bg-gradient-to-t lg:bg-gradient-to-r from-[#09090B] via-[#09090B]/90 to-[#09090B]/60 lg:to-transparent">
              <p className="text-xs font-medium tracking-wider text-rose-400 mb-3">
                Featured Premiere
              </p>

              <h1
                className="font-display font-bold tracking-tight text-white max-w-2xl"
                style={{ fontSize: 'clamp(2rem, 3.6vw, 3.25rem)', lineHeight: 1.08 }}
              >
                {title}
              </h1>

              {metadataParts.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-zinc-300 font-mono tabular-nums">
                  {metadataParts.map((part, idx) => (
                    <span key={`${part}-${idx}`} className="inline-flex items-center gap-2.5">
                      {idx > 0 && (
                        <span aria-hidden="true" className="text-zinc-600">
                          ·
                        </span>
                      )}
                      <span>{part}</span>
                    </span>
                  ))}
                </div>
              )}

              <p className="mt-4 max-w-xl text-sm sm:text-base leading-relaxed text-zinc-300 line-clamp-3">
                {featured?.description ||
                  'Browse and stream over 120,000 movies, regional blockbusters, and multi-season web series on Boflix.'}
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                {featured && (
                  <>
                    <button
                      type="button"
                      onMouseEnter={() => prefetchTitle(featured)}
                      onPointerDown={() => prefetchTitle(featured)}
                      onClick={() => onOpenDetail(featured)}
                      className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-rose-500 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                    >
                      <Play className="h-4 w-4 fill-current" aria-hidden="true" />
                      <span>Watch Now</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onToggleWatchlist(featured)}
                      className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-zinc-100 transition-colors duration-150 hover:bg-white/10 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                    >
                      {isSaved ? (
                        <Check className="h-4 w-4 text-rose-400" aria-hidden="true" />
                      ) : (
                        <Bookmark className="h-4 w-4" aria-hidden="true" />
                      )}
                      <span>{isSaved ? 'In Watchlist' : 'Add to Watchlist'}</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Right visual frame */}
            <div className="relative min-h-[240px] lg:col-span-6 lg:h-full">
              <MediaImage
                src={featured?.backdropPath || GENERATED_ASSETS.heroBackdrop}
                alt={title}
                mediaType={featured?.mediaType || 'movie'}
                variant="backdrop"
                className="h-full w-full object-cover"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#09090B] via-transparent to-transparent lg:bg-gradient-to-r lg:from-[#09090B] lg:via-[#09090B]/20 lg:to-transparent"
              />
            </div>
          </div>
        </div>

        {/* Full-width 4-column catalog metrics strip below hero split */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-white/8 bg-[#141418] px-5 py-4">
            <p className="text-xs font-medium text-zinc-400">Indexed Titles</p>
            <p className="mt-1 font-mono text-xl font-semibold text-white tabular-nums">
              {totalCatalogCount.toLocaleString()}
            </p>
          </div>
          <div className="rounded-xl border border-white/8 bg-[#141418] px-5 py-4">
            <p className="text-xs font-medium text-zinc-400">Active Genres</p>
            <p className="mt-1 font-mono text-xl font-semibold text-white tabular-nums">
              {genreCount || 40}
            </p>
          </div>
          <div className="rounded-xl border border-white/8 bg-[#141418] px-5 py-4">
            <p className="text-xs font-medium text-zinc-400">Curated Collections</p>
            <p className="mt-1 font-mono text-xl font-semibold text-white tabular-nums">
              {collectionCount || 8}
            </p>
          </div>
          <div className="rounded-xl border border-white/8 bg-[#141418] px-5 py-4">
            <p className="text-xs font-medium text-zinc-400">Streaming Networks</p>
            <p className="mt-1 font-mono text-xl font-semibold text-white tabular-nums">6</p>
          </div>
        </div>
      </div>
    </section>
  );
}
