import { Globe, Layers } from 'lucide-react';
import type { BrowseFilters, GenreItem } from '../types/media';

interface CategoryStripProps {
  genres: GenreItem[];
  onSelectCategory: (filters: BrowseFilters) => void;
}

const LANGUAGE_CARDS: Array<{
  label: string;
  sublabel: string;
  filters: BrowseFilters;
}> = [
  {
    label: 'Hindi Movies',
    sublabel: 'Hindi Cinema & Dubbed',
    filters: { type: '1', dubbing: 'Hindi', sortBy: 'date' },
  },
  {
    label: 'English Movies',
    sublabel: 'Original English Films',
    filters: { type: '1', dubbing: 'English', sortBy: 'date' },
  },
  {
    label: 'Hindi Web Series',
    sublabel: 'Hindi Originals & Shows',
    filters: { type: '2', dubbing: 'Hindi', sortBy: 'date' },
  },
  {
    label: 'English Web Series',
    sublabel: 'Original English Series',
    filters: { type: '2', dubbing: 'English', sortBy: 'date' },
  },
  {
    label: 'Telugu',
    sublabel: 'Tollywood Cinema',
    filters: { type: 'all', dubbing: 'Telugu', sortBy: 'date' },
  },
  {
    label: 'Tamil',
    sublabel: 'Kollywood Hits',
    filters: { type: 'all', dubbing: 'Tamil', sortBy: 'date' },
  },
];

export function CategoryStrip({ genres, onSelectCategory }: CategoryStripProps) {
  const topGenres = genres.slice(0, 18);

  return (
    <section aria-label="Browse by Language and Genre" className="py-6 sm:py-8">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-12 space-y-6">
        {/* Language-organized hubs */}
        <div>
          <div className="mb-3.5 flex items-center gap-2">
            <Globe className="h-4 w-4 text-rose-500 shrink-0" aria-hidden="true" />
            <h2 className="font-display text-lg sm:text-xl font-semibold tracking-tight text-white">
              Browse by Language
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
            {LANGUAGE_CARDS.map((card) => (
              <button
                key={card.label}
                type="button"
                onClick={() => onSelectCategory(card.filters)}
                className="group rounded-xl border border-white/10 bg-[#141418] px-4 py-3.5 text-left transition-colors hover:border-rose-500/50 hover:bg-[#191920] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
              >
                <p className="font-display text-sm font-semibold text-white group-hover:text-rose-300 transition-colors">
                  {card.label}
                </p>
                <p className="mt-0.5 text-xs text-zinc-400 line-clamp-1">{card.sublabel}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Clean Genres Strip */}
        {topGenres.length > 0 && (
          <div>
            <div className="mb-3 flex items-center gap-2">
              <Layers className="h-4 w-4 text-rose-500 shrink-0" aria-hidden="true" />
              <h2 className="font-display text-lg sm:text-xl font-semibold tracking-tight text-white">
                Genres
              </h2>
            </div>

            <div className="flex flex-wrap gap-2">
              {topGenres.map((genre) => (
                <button
                  key={genre.tid}
                  type="button"
                  onClick={() => onSelectCategory({ type: 'all', genreId: genre.tid, sortBy: 'date' })}
                  className="inline-flex min-h-[36px] items-center gap-2 rounded-lg border border-white/10 bg-[#141418] px-3.5 text-xs font-medium text-zinc-200 transition-colors hover:border-rose-500/50 hover:bg-rose-600/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                >
                  <span>{genre.name}</span>
                  <span className="font-mono text-[11px] text-zinc-500 tabular-nums">
                    {genre.count.toLocaleString()}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
