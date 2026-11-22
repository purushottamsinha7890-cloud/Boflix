import { Menu, Search, X } from 'lucide-react';
import { useState } from 'react';

export type NavSection = 'home' | 'movies' | 'series' | 'explore' | 'watchlist';

interface TopBarProps {
  activeSection: NavSection;
  watchlistCount: number;
  onNavigate: (section: NavSection) => void;
  onOpenSearch: () => void;
}

const NAV_ITEMS: Array<{ id: NavSection; label: string }> = [
  { id: 'home', label: 'Home' },
  { id: 'movies', label: 'Movies' },
  { id: 'series', label: 'Web Series' },
  { id: 'explore', label: 'Explore' },
  { id: 'watchlist', label: 'Watchlist' },
];

export function TopBar({
  activeSection,
  watchlistCount,
  onNavigate,
  onOpenSearch,
}: TopBarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (section: NavSection) => {
    onNavigate(section);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-white/8 bg-[#09090B]/92 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-8 px-4 sm:px-8 lg:px-12">
        {/* Zone 1: Single clean wordmark */}
        <a
          href="#home"
          onClick={(e) => {
            e.preventDefault();
            handleNavClick('home');
          }}
          className="font-display text-xl font-bold tracking-tight text-white whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 rounded"
        >
          Boflix
        </a>

        {/* Zone 2: 5 concise single-line text links */}
        <nav aria-label="Primary navigation" className="hidden md:flex items-center gap-7">
          {NAV_ITEMS.map((item) => {
            const isActive = activeSection === item.id;
            const label =
              item.id === 'watchlist' && watchlistCount > 0
                ? `${item.label} (${watchlistCount})`
                : item.label;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`relative py-1.5 text-sm font-medium whitespace-nowrap shrink-0 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 rounded ${
                  isActive ? 'text-white' : 'text-zinc-400 hover:text-zinc-100'
                }`}
              >
                {label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 -bottom-[17px] h-0.5 bg-rose-600"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Single primary action */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenSearch}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-rose-600 px-4 text-sm font-medium text-white transition-colors duration-150 hover:bg-rose-500 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
          >
            <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Search Titles</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 text-zinc-200 md:hidden hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile navigation drawer */}
      {mobileMenuOpen && (
        <nav
          aria-label="Mobile navigation"
          className="border-t border-white/8 bg-[#0E0E12] px-4 py-3 md:hidden"
        >
          <div className="flex flex-wrap gap-2">
            {NAV_ITEMS.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  className={`min-h-[44px] rounded-lg px-3.5 text-sm font-medium whitespace-nowrap shrink-0 transition-colors ${
                    isActive
                      ? 'bg-rose-600 text-white'
                      : 'bg-white/5 text-zinc-300 hover:bg-white/10'
                  }`}
                >
                  {item.id === 'watchlist' && watchlistCount > 0
                    ? `${item.label} (${watchlistCount})`
                    : item.label}
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </header>
  );
}
