import type { NavSection } from './TopBar';

interface FooterProps {
  onNavigate: (section: NavSection) => void;
}

export function Footer({ onNavigate }: FooterProps) {
  return (
    <footer className="mt-12 border-t border-white/8 bg-[#09090B] py-10">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
        <div>
          <span className="font-display text-lg font-bold tracking-tight text-white">
            Boflix
          </span>
          <p className="mt-1 text-xs text-zinc-500">
            Movies &amp; Web Series streaming catalog.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-6 text-xs font-medium text-zinc-400">
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="hover:text-white transition-colors"
          >
            Home
          </button>
          <button
            type="button"
            onClick={() => onNavigate('movies')}
            className="hover:text-white transition-colors"
          >
            Movies
          </button>
          <button
            type="button"
            onClick={() => onNavigate('series')}
            className="hover:text-white transition-colors"
          >
            Web Series
          </button>
          <button
            type="button"
            onClick={() => onNavigate('explore')}
            className="hover:text-white transition-colors"
          >
            Explore Genres
          </button>
          <button
            type="button"
            onClick={() => onNavigate('watchlist')}
            className="hover:text-white transition-colors"
          >
            Watchlist
          </button>
        </div>
      </div>
    </footer>
  );
}
