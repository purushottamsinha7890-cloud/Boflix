import { Loader2, Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { searchTitles, suggestTitles } from '../lib/api';
import type { MediaItem, PagerInfo } from '../types/media';
import { MediaCard } from './MediaCard';
import { MediaImage } from './MediaImage';

interface SearchModalProps {
  isOpen: boolean;
  watchlistIds: Set<string>;
  onClose: () => void;
  onSelectItem: (item: MediaItem) => void;
  onToggleWatchlist: (item: MediaItem) => void;
}

export function SearchModal({
  isOpen,
  watchlistIds,
  onClose,
  onSelectItem,
  onToggleWatchlist,
}: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'' | '1' | '2'>('');
  const [suggestions, setSuggestions] = useState<MediaItem[]>([]);
  const [results, setResults] = useState<MediaItem[]>([]);
  const [pager, setPager] = useState<PagerInfo | null>(null);
  const [page, setPage] = useState(0);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const t = setTimeout(() => inputRef.current?.focus(), 40);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      clearTimeout(t);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!isOpen || trimmed.length < 2 || hasSubmitted) {
      if (trimmed.length < 2) setSuggestions([]);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setSuggestLoading(true);
      try {
        const res = await suggestTitles(trimmed);
        if (!cancelled) setSuggestions(res.results.slice(0, 8));
      } catch {
        if (!cancelled) setSuggestions([]);
      } finally {
        if (!cancelled) setSuggestLoading(false);
      }
    }, 240);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, isOpen, hasSubmitted]);

  const executeSearch = async (targetQuery: string, targetPage = 0, targetType = typeFilter) => {
    const q = targetQuery.trim();
    if (!q) return;
    setLoading(true);
    setHasSubmitted(true);
    try {
      const res = await searchTitles(q, targetPage, targetType);
      setPager(res.pager);
      setPage(targetPage);
      setResults((prev) => (targetPage === 0 ? res.results : [...prev, ...res.results]));
    } catch {
      if (targetPage === 0) setResults([]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Search Boflix catalog"
      className="fixed inset-0 z-50 flex flex-col bg-black/85 backdrop-blur-md"
    >
      <div className="mx-auto flex w-full max-w-[1160px] flex-col overflow-hidden px-4 py-6 sm:px-8 h-full">
        {/* Search header */}
        <div className="flex items-center gap-3 border-b border-white/10 pb-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              executeSearch(query, 0, typeFilter);
            }}
            className="relative flex-1"
          >
            <Search
              className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
              aria-hidden="true"
            />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setHasSubmitted(false);
              }}
              placeholder="Search movies, web series, K-dramas, or franchises..."
              className="h-12 w-full rounded-xl border border-white/15 bg-[#141418] pl-11 pr-28 text-sm sm:text-base text-white placeholder:text-zinc-500 focus:border-rose-500 focus:outline-none"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-rose-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-rose-500"
            >
              Search
            </button>
          </form>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/12 bg-[#141418] text-zinc-300 hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Type filter tabs when searching */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-1 rounded-lg border border-white/8 bg-[#141418] p-1">
            {[
              { label: 'All Results', value: '' as const },
              { label: 'Movies Only', value: '1' as const },
              { label: 'Web Series Only', value: '2' as const },
            ].map((opt) => (
              <button
                key={opt.value || 'all'}
                type="button"
                onClick={() => {
                  setTypeFilter(opt.value);
                  if (query.trim()) {
                    executeSearch(query, 0, opt.value);
                  }
                }}
                className={`min-h-[36px] rounded-md px-3 text-xs font-medium whitespace-nowrap transition-colors ${
                  typeFilter === opt.value
                    ? 'bg-rose-600 text-white'
                    : 'text-zinc-400 hover:text-zinc-100'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {hasSubmitted && pager && (
            <p className="font-mono text-xs text-zinc-400 tabular-nums">
              {pager.totalResults.toLocaleString()} results for "{query.trim()}"
            </p>
          )}
        </div>

        {/* Scrollable body */}
        <div className="mt-5 flex-1 overflow-y-auto pr-1">
          {!hasSubmitted && query.trim().length < 2 && (
            <div className="py-12 text-center">
              <p className="font-display text-lg font-medium text-zinc-200">
                Search the Boflix catalog
              </p>
              <p className="mt-1.5 text-sm text-zinc-400">
                Type at least 2 characters for instant title suggestions, or press Enter for full results.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {['Stranger Things', 'Avengers', 'Mirzapur', 'Inception', 'Squid Game'].map(
                  (sample) => (
                    <button
                      key={sample}
                      type="button"
                      onClick={() => {
                        setQuery(sample);
                        executeSearch(sample, 0, typeFilter);
                      }}
                      className="min-h-[36px] rounded-lg border border-white/10 bg-[#141418] px-3.5 text-xs font-medium text-zinc-300 hover:border-rose-500/60 hover:text-white"
                    >
                      {sample}
                    </button>
                  )
                )}
              </div>
            </div>
          )}

          {/* Instant live suggestions */}
          {!hasSubmitted && query.trim().length >= 2 && (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-medium text-zinc-400">Instant Suggestions</p>
                {suggestLoading && <Loader2 className="h-4 w-4 animate-spin text-rose-500" />}
              </div>

              {suggestions.length > 0 ? (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {suggestions.map((item, idx) => (
                    <button
                      key={`suggest-${item.id}-${idx}`}
                      type="button"
                      onClick={() => {
                        onSelectItem(item);
                        onClose();
                      }}
                      className="flex items-center gap-3.5 rounded-xl border border-white/8 bg-[#141418] p-2.5 text-left transition-colors hover:border-rose-500/50 hover:bg-white/5"
                    >
                      <div className="h-16 w-12 shrink-0 overflow-hidden rounded-lg bg-zinc-900">
                        <MediaImage
                          src={item.backdropPath}
                          alt={item.title}
                          mediaType={item.mediaType}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-display text-sm font-semibold text-white truncate">
                          {item.title}
                        </p>
                        <p className="mt-1 font-mono text-xs text-zinc-400 tabular-nums">
                          {item.mediaType === 'tv' ? 'Web Series' : 'Movie'}
                          {item.releaseYear ? ` · ${item.releaseYear}` : ''}
                          {item.voteAverage !== '—' ? ` · ${item.voteAverage} IMDb` : ''}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                !suggestLoading && (
                  <p className="py-8 text-center text-sm text-zinc-400">
                    Press Enter to run a deep search across all catalog entries.
                  </p>
                )
              )}
            </div>
          )}

          {/* Submitted full search results */}
          {hasSubmitted && (
            <>
              {loading && page === 0 ? (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
                  {Array.from({ length: 10 }).map((_, idx) => (
                    <div key={idx} className="space-y-2">
                      <div className="aspect-[3/4] animate-pulse rounded-xl bg-zinc-900" />
                      <div className="h-4 w-3/4 animate-pulse rounded bg-zinc-900" />
                    </div>
                  ))}
                </div>
              ) : results.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="font-display text-lg font-medium text-white">
                    No titles matched "{query.trim()}"
                  </p>
                  <p className="mt-1 text-sm text-zinc-400">
                    Check spelling or switch from Movies/Series filter to All Results.
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
                    {results.map((item, idx) => (
                      <MediaCard
                        key={`search-${item.id}-${idx}`}
                        item={item}
                        isSaved={watchlistIds.has(item.id)}
                        onSelect={(selected) => {
                          onSelectItem(selected);
                          onClose();
                        }}
                        onToggleWatchlist={onToggleWatchlist}
                      />
                    ))}
                  </div>

                  {pager && page + 1 < pager.totalPages && (
                    <div className="mt-8 flex justify-center pb-4">
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => executeSearch(query, page + 1, typeFilter)}
                        className="inline-flex min-h-[44px] items-center rounded-lg border border-white/12 bg-[#141418] px-6 text-sm font-medium text-zinc-100 hover:border-rose-500/60"
                      >
                        {loading ? 'Loading...' : 'Load More Search Results'}
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
