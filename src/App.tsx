import { useEffect, useMemo, useState } from 'react';
import { CatalogBrowser } from './components/CatalogBrowser';
import { CategoryStrip } from './components/CategoryStrip';
import { CollectionRow } from './components/CollectionRow';
import { DetailModal } from './components/DetailModal';
import { Footer } from './components/Footer';
import { HeroSpotlight } from './components/HeroSpotlight';
import { SearchModal } from './components/SearchModal';
import { type NavSection, TopBar } from './components/TopBar';
import { TrendingNowRow } from './components/TrendingNowRow';
import { WatchlistView } from './components/WatchlistView';
import { fetchGenres, fetchHomeCatalog } from './lib/api';
import type {
  BrowseFilters,
  CuratedCollection,
  GenreItem,
  HomeCatalogResponse,
  MediaItem,
} from './types/media';

const WATCHLIST_STORAGE_KEY = 'boflix_watchlist_v1';

function loadInitialWatchlist(): MediaItem[] {
  try {
    const raw =
      localStorage.getItem(WATCHLIST_STORAGE_KEY) ||
      localStorage.getItem('netmirror_watchlist_v1');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function App() {
  const [activeSection, setActiveSection] = useState<NavSection>('home');
  const [activeCollection, setActiveCollection] = useState<CuratedCollection | null>(null);
  const [exploreFilters, setExploreFilters] = useState<BrowseFilters | null>(null);
  const [exploreFilterSeed, setExploreFilterSeed] = useState(0);
  const [homeData, setHomeData] = useState<HomeCatalogResponse | null>(null);
  const [genres, setGenres] = useState<GenreItem[]>([]);
  const [homeLoading, setHomeLoading] = useState(true);
  const [homeError, setHomeError] = useState<string | null>(null);

  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [watchlist, setWatchlist] = useState<MediaItem[]>(loadInitialWatchlist);

  const watchlistIds = useMemo(() => new Set(watchlist.map((i) => i.id)), [watchlist]);

  useEffect(() => {
    try {
      localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(watchlist));
    } catch {
      // Ignore storage quota errors
    }
  }, [watchlist]);

  const loadHome = () => {
    setHomeLoading(true);
    setHomeError(null);
    fetchHomeCatalog()
      .then((res) => {
        setHomeData(res);
        if (res.genres.length > 0) {
          setGenres(res.genres);
        } else {
          fetchGenres()
            .then((g) => setGenres(g.genres))
            .catch(() => {});
        }
      })
      .catch((err) => {
        setHomeError(err instanceof Error ? err.message : 'Unable to connect to Boflix catalog.');
      })
      .finally(() => {
        setHomeLoading(false);
      });
  };

  useEffect(() => {
    loadHome();
  }, []);

  // Keyboard shortcut: '/' or Cmd/Ctrl + K opens live search
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.tagName === 'SELECT';
      if ((e.key === '/' && !isInput) || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const handleToggleWatchlist = (item: MediaItem) => {
    setWatchlist((prev) => {
      if (prev.some((existing) => existing.id === item.id)) {
        return prev.filter((existing) => existing.id !== item.id);
      }
      return [item, ...prev];
    });
  };

  const handleNavigate = (section: NavSection) => {
    setActiveCollection(null);
    setExploreFilters(null);
    setActiveSection(section);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectCategory = (filters: BrowseFilters) => {
    setActiveCollection(null);
    setExploreFilters(filters);
    setExploreFilterSeed((n) => n + 1);
    setActiveSection(filters.type === '1' ? 'movies' : filters.type === '2' ? 'series' : 'explore');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleViewCollection = (collection: CuratedCollection) => {
    setActiveCollection(collection);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#09090B] text-zinc-100">
      <TopBar
        activeSection={activeCollection ? 'explore' : activeSection}
        watchlistCount={watchlist.length}
        onNavigate={handleNavigate}
        onOpenSearch={() => setSearchOpen(true)}
      />

      <main className="flex-1">
        {activeCollection ? (
          <CatalogBrowser
            mode="collection"
            activeCollection={activeCollection}
            genres={genres}
            watchlistIds={watchlistIds}
            onSelectItem={setSelectedItem}
            onToggleWatchlist={handleToggleWatchlist}
            onExitCollection={() => setActiveCollection(null)}
          />
        ) : activeSection === 'home' ? (
          <>
            {homeLoading ? (
              <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-8 lg:px-12 space-y-8">
                <div className="h-[440px] w-full animate-pulse rounded-2xl bg-[#141418]" />
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-20 animate-pulse rounded-xl bg-[#141418]" />
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="aspect-[3/4] animate-pulse rounded-xl bg-[#141418]" />
                  ))}
                </div>
              </div>
            ) : homeError ? (
              <div className="mx-auto max-w-[1440px] px-4 py-16 sm:px-8 lg:px-12">
                <div className="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-10 text-center">
                  <h1 className="font-display text-xl font-semibold text-white">
                    Unable to reach the Boflix catalog server
                  </h1>
                  <p className="mt-2 text-sm text-rose-200">{homeError}</p>
                  <button
                    type="button"
                    onClick={loadHome}
                    className="mt-6 inline-flex min-h-[44px] items-center rounded-lg bg-rose-600 px-5 text-sm font-semibold text-white hover:bg-rose-500"
                  >
                    Retry Connection
                  </button>
                </div>
              </div>
            ) : (
              <>
                <HeroSpotlight
                  featured={homeData?.featured || null}
                  totalCatalogCount={homeData?.totalCatalogCount || 120548}
                  genreCount={genres.length || 40}
                  collectionCount={homeData?.collections.length || 8}
                  isSaved={homeData?.featured ? watchlistIds.has(homeData.featured.id) : false}
                  onOpenDetail={setSelectedItem}
                  onToggleWatchlist={handleToggleWatchlist}
                />

                <div className="divide-y divide-white/6">
                  <TrendingNowRow
                    watchlistIds={watchlistIds}
                    onSelectItem={setSelectedItem}
                    onToggleWatchlist={handleToggleWatchlist}
                    onViewAll={handleViewCollection}
                  />

                  <CategoryStrip genres={genres} onSelectCategory={handleSelectCategory} />

                  {(homeData?.collections || [])
                    .filter((collection) => collection.id !== '11')
                    .map((collection) => (
                      <CollectionRow
                        key={collection.id}
                        collection={collection}
                        watchlistIds={watchlistIds}
                        onSelectItem={setSelectedItem}
                        onToggleWatchlist={handleToggleWatchlist}
                        onViewAll={handleViewCollection}
                      />
                    ))}
                </div>
              </>
            )}
          </>
        ) : activeSection === 'movies' ? (
          <CatalogBrowser
            mode="movies"
            activeCollection={null}
            genres={genres}
            initialFilters={exploreFilters}
            filterSeed={exploreFilterSeed}
            watchlistIds={watchlistIds}
            onSelectItem={setSelectedItem}
            onToggleWatchlist={handleToggleWatchlist}
          />
        ) : activeSection === 'series' ? (
          <CatalogBrowser
            mode="series"
            activeCollection={null}
            genres={genres}
            initialFilters={exploreFilters}
            filterSeed={exploreFilterSeed}
            watchlistIds={watchlistIds}
            onSelectItem={setSelectedItem}
            onToggleWatchlist={handleToggleWatchlist}
          />
        ) : activeSection === 'explore' ? (
          <CatalogBrowser
            mode="explore"
            activeCollection={null}
            genres={genres}
            initialFilters={exploreFilters}
            filterSeed={exploreFilterSeed}
            watchlistIds={watchlistIds}
            onSelectItem={setSelectedItem}
            onToggleWatchlist={handleToggleWatchlist}
          />
        ) : (
          <WatchlistView
            items={watchlist}
            watchlistIds={watchlistIds}
            onSelectItem={setSelectedItem}
            onToggleWatchlist={handleToggleWatchlist}
            onClearAll={() => setWatchlist([])}
            onBrowseCatalog={() => handleNavigate('explore')}
          />
        )}
      </main>

      <Footer onNavigate={handleNavigate} />

      <SearchModal
        isOpen={searchOpen}
        watchlistIds={watchlistIds}
        onClose={() => setSearchOpen(false)}
        onSelectItem={setSelectedItem}
        onToggleWatchlist={handleToggleWatchlist}
      />

      <DetailModal
        item={selectedItem}
        watchlistIds={watchlistIds}
        onClose={() => setSelectedItem(null)}
        onSelectItem={setSelectedItem}
        onToggleWatchlist={handleToggleWatchlist}
      />
    </div>
  );
}
