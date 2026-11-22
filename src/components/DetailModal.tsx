import Hls from 'hls.js';
import {
  Bookmark,
  Check,
  ChevronRight,
  Film,
  Loader2,
  Play,
  RotateCcw,
  RotateCw,
  Server,
  Tv,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { fetchStreamServers, fetchTitleDetail } from '../lib/api';
import { GENERATED_ASSETS } from '../lib/constants';
import type {
  DirectStreamOption,
  MediaDetail,
  MediaItem,
  SeasonInfo,
  StreamServer,
  SubtitleTrack,
} from '../types/media';
import { MediaCard } from './MediaCard';
import { MediaImage } from './MediaImage';

interface DetailModalProps {
  item: MediaItem | null;
  watchlistIds: Set<string>;
  onClose: () => void;
  onSelectItem: (item: MediaItem) => void;
  onToggleWatchlist: (item: MediaItem) => void;
}

type TheaterMode = 'backdrop' | 'stream' | 'trailer';

function getEpisodesForSeason(seasonObj?: SeasonInfo): number[] {
  if (!seasonObj) return [1];
  if (seasonObj.allEp && seasonObj.allEp.trim()) {
    const parsed = seasonObj.allEp
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n) && n > 0);
    if (parsed.length > 0) return parsed;
  }
  const count = Math.max(1, Math.min(seasonObj.ep || 1, 100));
  return Array.from({ length: count }, (_, idx) => idx + 1);
}

interface HlsVideoPlayerProps {
  src: string;
  proxySrc?: string;
  poster: string;
  subtitles: SubtitleTrack[];
  onFatalError: () => void;
}

function HlsVideoPlayer({ src, proxySrc, poster, subtitles, onFatalError }: HlsVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onFatalErrorRef = useRef(onFatalError);
  onFatalErrorRef.current = onFatalError;
  const [activeSrc, setActiveSrc] = useState(src);
  const triedProxyRef = useRef(false);

  useEffect(() => {
    setActiveSrc(src);
    triedProxyRef.current = false;
  }, [src, proxySrc]);

  const handleSourceFailure = () => {
    if (proxySrc && !triedProxyRef.current && activeSrc !== proxySrc) {
      triedProxyRef.current = true;
      setActiveSrc(proxySrc);
      return;
    }
    onFatalErrorRef.current();
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !activeSrc) return;

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = activeSrc;
      video.play().catch(() => {});
      return;
    }

    if (!Hls.isSupported()) {
      handleSourceFailure();
      return;
    }

    const hls = new Hls({
      enableWorker: true,
      lowLatencyMode: false,
      startFragPrefetch: true,
      maxBufferLength: 30,
      maxMaxBufferLength: 60,
    });

    hls.loadSource(activeSrc);
    hls.attachMedia(video);
    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      video.play().catch(() => {});
    });
    hls.on(Hls.Events.ERROR, (_event, data) => {
      if (data.fatal) {
        hls.destroy();
        handleSourceFailure();
      }
    });

    return () => {
      hls.destroy();
    };
  }, [activeSrc]);

  return (
    <video
      ref={videoRef}
      poster={poster}
      controls
      autoPlay
      playsInline
      onError={handleSourceFailure}
      className="h-full w-full bg-black object-contain"
    >
      {subtitles.map((sub) => (
        <track
          key={sub.lan}
          kind="subtitles"
          src={sub.url}
          srcLang={sub.lan}
          label={sub.lanName}
          default={sub.lan === 'en'}
        />
      ))}
    </video>
  );
}

export function DetailModal({
  item,
  watchlistIds,
  onClose,
  onSelectItem,
  onToggleWatchlist,
}: DetailModalProps) {
  const [detail, setDetail] = useState<MediaDetail | null>(null);
  const [related, setRelated] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [theaterMode, setTheaterMode] = useState<TheaterMode>('stream');
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [selectedEpisode, setSelectedEpisode] = useState<number>(1);

  const [directStreams, setDirectStreams] = useState<DirectStreamOption[]>([]);
  const [activeDirectIdx, setActiveDirectIdx] = useState<number>(0);
  const [subtitles, setSubtitles] = useState<SubtitleTrack[]>([]);
  const [servers, setServers] = useState<StreamServer[]>([]);
  const [activeServerId, setActiveServerId] = useState<string>('vidsync');
  const [failedHlsIds, setFailedHlsIds] = useState<Set<string>>(() => new Set());
  const [streamLoading, setStreamLoading] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);

  const theaterRef = useRef<HTMLDivElement>(null);
  const userPickedServerRef = useRef(false);
  const [isCssRotated, setIsCssRotated] = useState(false);
  const [isNativeLandscapeLocked, setIsNativeLandscapeLocked] = useState(false);
  const [isPortraitViewport, setIsPortraitViewport] = useState(() =>
    typeof window !== 'undefined' ? window.innerHeight > window.innerWidth : false
  );

  const exitRotateMode = async () => {
    setIsCssRotated(false);
    setIsNativeLandscapeLocked(false);
    try {
      const orientationApi = screen.orientation as ScreenOrientation & {
        unlock?: () => void;
      };
      orientationApi?.unlock?.();
    } catch {
      // Ignore unsupported unlock errors
    }
    if (document.fullscreenElement && document.exitFullscreen) {
      await document.exitFullscreen().catch(() => {});
    }
  };

  const handleToggleRotate = async () => {
    if (isCssRotated || isNativeLandscapeLocked) {
      await exitRotateMode();
      return;
    }

    setTheaterMode('stream');
    let nativeLocked = false;

    try {
      const el = theaterRef.current;
      if (el && !document.fullscreenElement && el.requestFullscreen) {
        await el.requestFullscreen();
      }
      const orientationApi = screen.orientation as ScreenOrientation & {
        lock?: (orientation: 'landscape' | 'portrait' | 'any') => Promise<void>;
      };
      if (orientationApi && typeof orientationApi.lock === 'function') {
        await orientationApi.lock('landscape');
        nativeLocked = true;
        setIsNativeLandscapeLocked(true);
      }
    } catch {
      nativeLocked = false;
    }

    if (!nativeLocked) {
      if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen().catch(() => {});
      }
      setIsCssRotated(true);
    }
  };

  useEffect(() => {
    const syncViewport = () => {
      setIsPortraitViewport(window.innerHeight > window.innerWidth);
    };
    syncViewport();
    window.addEventListener('resize', syncViewport);
    window.addEventListener('orientationchange', syncViewport);
    return () => {
      window.removeEventListener('resize', syncViewport);
      window.removeEventListener('orientationchange', syncViewport);
    };
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsNativeLandscapeLocked(false);
        try {
          const orientationApi = screen.orientation as ScreenOrientation & {
            unlock?: () => void;
          };
          orientationApi?.unlock?.();
        } catch {
          // Ignore unlock errors
        }
      } else if (window.innerHeight > window.innerWidth) {
        try {
          const orientationApi = screen.orientation as ScreenOrientation & {
            lock?: (orientation: 'landscape' | 'portrait' | 'any') => Promise<void>;
          };
          orientationApi?.lock?.('landscape')?.catch?.(() => {});
        } catch {
          // Ignore orientation lock errors
        }
      }
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  useEffect(() => {
    if (!item) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isCssRotated) {
          void exitRotateMode();
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [item, isCssRotated, onClose]);

  useEffect(() => {
    if (!item) {
      setDetail(null);
      setRelated([]);
      setDirectStreams([]);
      setSubtitles([]);
      setServers([]);
      setFailedHlsIds(new Set());
      setIsCssRotated(false);
      setIsNativeLandscapeLocked(false);
      userPickedServerRef.current = false;
      return;
    }

    let cancelled = false;
    userPickedServerRef.current = false;
    setIsCssRotated(false);
    setIsNativeLandscapeLocked(false);
    setLoading(true);
    setError(null);
    setTheaterMode('stream');
    setSelectedSeason(1);
    setSelectedEpisode(1);
    setDirectStreams([]);
    setSubtitles([]);
    setServers([]);
    setActiveServerId('');
    setFailedHlsIds(new Set());
    setActiveDirectIdx(0);
    setStreamError(null);

    fetchTitleDetail(item.mediaType, item.id)
      .then((res) => {
        if (cancelled) return;
        setDetail(res.detail);
        setRelated(res.related);
        if (res.detail.seasons.length > 0) {
          const firstSeason = res.detail.seasons[0];
          const firstEps = getEpisodesForSeason(firstSeason);
          setSelectedSeason(firstSeason.se);
          setSelectedEpisode(firstEps[0] ?? 1);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load title details.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [item?.id, item?.mediaType]);

  // Resolve streams immediately on open and only on title/episode changes (never re-trigger on detail load)
  useEffect(() => {
    if (!item) return;

    let cancelled = false;
    setStreamLoading(true);
    setStreamError(null);
    setActiveDirectIdx(0);
    setFailedHlsIds(new Set());

    fetchStreamServers({
      id: item.id,
      title: item.title,
      mediaType: item.mediaType,
      season: selectedSeason,
      episode: selectedEpisode,
    })
      .then((res) => {
        if (cancelled) return;
        const nextServers = res.servers || [];
        const nextDirect = res.directStreams || [];
        setDirectStreams(nextDirect);
        setSubtitles(res.subtitles || []);
        setServers(nextServers);

        const firstHlsServer = nextServers.find((s) => Boolean(s.hlsUrl));
        const preferredDefault =
          firstHlsServer?.id ||
          nextServers[0]?.id ||
          (nextDirect.length > 0 ? 'original' : '');

        setActiveServerId((prev) => {
          if (userPickedServerRef.current) {
            if (prev === 'original' && nextDirect.length > 0) return prev;
            if (nextServers.some((s) => s.id === prev)) return prev;
          }
          return preferredDefault;
        });
      })
      .catch((err) => {
        if (!cancelled) {
          setStreamError(err instanceof Error ? err.message : 'Streaming servers unavailable.');
        }
      })
      .finally(() => {
        if (!cancelled) setStreamLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [item?.id, item?.mediaType, item?.title, selectedSeason, selectedEpisode]);

  if (!item) return null;

  const active = detail || item;
  const isSaved = watchlistIds.has(active.id);
  const activeSeasonObj = detail?.seasons.find((s) => s.se === selectedSeason) || detail?.seasons[0];
  const episodeNumbers = getEpisodesForSeason(activeSeasonObj);

  const hasOriginalDirect = directStreams.length > 0;
  const activeDirectStream = directStreams[activeDirectIdx] || directStreams[0] || null;
  const isUsingOriginal = activeServerId === 'original' && hasOriginalDirect;
  const activeEmbedServer = servers.find((s) => s.id === activeServerId) || servers[0] || null;

  const currentEpisodeIndex = episodeNumbers.indexOf(selectedEpisode);
  const nextEpisode =
    currentEpisodeIndex >= 0 && currentEpisodeIndex + 1 < episodeNumbers.length
      ? episodeNumbers[currentEpisodeIndex + 1]
      : null;

  const metadataParts = [
    active.mediaType === 'tv' ? 'Web Series' : 'Movie',
    active.releaseYear,
    active.country,
    detail?.durationMinutes ? `${detail.durationMinutes} min` : null,
    active.voteAverage !== '—' ? `${active.voteAverage} IMDb` : null,
  ].filter(Boolean);

  const startStreaming = () => {
    setTheaterMode('stream');
    theaterRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={active.title}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-6 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-[92vh] w-full max-w-[1040px] flex-col overflow-hidden rounded-2xl border border-white/12 bg-[#0E0E12] shadow-2xl"
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close detail view"
          className="absolute right-4 top-4 z-20 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/15 bg-black/70 text-zinc-200 transition-colors hover:bg-black hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="overflow-y-auto">
          {/* Media Theater Stage */}
          <div
            ref={theaterRef}
            className={
              isCssRotated
                ? 'fixed inset-0 z-[90] bg-black overflow-hidden'
                : 'relative aspect-video w-full bg-black overflow-hidden border-b border-white/8'
            }
          >
            <div
              className={
                isCssRotated && isPortraitViewport
                  ? 'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rotate-90 w-[100dvh] h-[100dvw] bg-black overflow-hidden'
                  : 'relative h-full w-full bg-black overflow-hidden'
              }
            >
              {isCssRotated && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    void exitRotateMode();
                  }}
                  aria-label="Exit landscape rotation"
                  className="absolute right-3 top-3 z-30 inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-white/20 bg-black/75 px-3 text-xs font-medium text-white backdrop-blur-sm transition-colors hover:bg-rose-600 hover:border-rose-500"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Exit Rotate</span>
                </button>
              )}

              {theaterMode === 'stream' ? (
              streamLoading ? (
                <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[#09090B] text-zinc-300">
                  <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
                  <p className="text-sm font-medium">Starting ad-free fast stream...</p>
                </div>
              ) : isUsingOriginal && activeDirectStream ? (
                <video
                  key={`orig-${active.id}-${selectedSeason}-${selectedEpisode}-${activeDirectStream.url}`}
                  src={activeDirectStream.url}
                  poster={active.backdropPath || GENERATED_ASSETS.heroBackdrop}
                  controls
                  autoPlay
                  playsInline
                  onError={() => {
                    if (activeDirectIdx + 1 < directStreams.length) {
                      setActiveDirectIdx(activeDirectIdx + 1);
                    }
                  }}
                  className="h-full w-full bg-black object-contain"
                >
                  {subtitles.map((sub) => (
                    <track
                      key={sub.lan}
                      kind="subtitles"
                      src={sub.url}
                      srcLang={sub.lan}
                      label={sub.lanName}
                      default={sub.lan === 'en'}
                    />
                  ))}
                </video>
              ) : activeEmbedServer ? (
                activeEmbedServer.hlsUrl && !failedHlsIds.has(activeEmbedServer.id) ? (
                  <HlsVideoPlayer
                    key={`hls-${activeEmbedServer.id}-${active.id}-${selectedSeason}-${selectedEpisode}`}
                    src={activeEmbedServer.hlsUrl}
                    proxySrc={activeEmbedServer.hlsProxyUrl}
                    poster={active.backdropPath || GENERATED_ASSETS.heroBackdrop}
                    subtitles={subtitles}
                    onFatalError={() => {
                      const failedId = activeEmbedServer.id;
                      setFailedHlsIds((prev) => {
                        const next = new Set(prev);
                        next.add(failedId);
                        return next;
                      });
                    }}
                  />
                ) : (
                  <iframe
                    key={`${activeEmbedServer.id}-${active.id}-${selectedSeason}-${selectedEpisode}`}
                    src={activeEmbedServer.embedUrl}
                    title={`${active.title} — ${activeEmbedServer.name}`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen; screen-wake-lock"
                    allowFullScreen
                    loading="eager"
                    referrerPolicy="strict-origin-when-cross-origin"
                    className="h-full w-full border-0 bg-black"
                  />
                )
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[#09090B] p-6 text-center">
                  <p className="text-sm font-medium text-rose-300">
                    {streamError || 'No streaming server could be loaded for this title.'}
                  </p>
                  {detail?.trailerUrl && (
                    <button
                      type="button"
                      onClick={() => setTheaterMode('trailer')}
                      className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-rose-600 px-4 text-xs font-semibold text-white hover:bg-rose-500"
                    >
                      <Play className="h-3.5 w-3.5 fill-current" />
                      <span>Play Preview Trailer Instead</span>
                    </button>
                  )}
                </div>
              )
            ) : theaterMode === 'trailer' && detail?.trailerUrl ? (
              <video
                src={detail.trailerUrl}
                poster={detail.backdropPath || GENERATED_ASSETS.heroBackdrop}
                controls
                autoPlay
                playsInline
                className="h-full w-full object-contain bg-black"
              />
            ) : (
              <>
                <MediaImage
                  src={active.backdropPath}
                  alt={active.title}
                  mediaType={active.mediaType}
                  variant="backdrop"
                  className="h-full w-full object-cover"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0E0E12] via-[#0E0E12]/40 to-transparent"
                />

                {/* Center Quick Play button overlay */}
                <button
                  type="button"
                  onClick={startStreaming}
                  aria-label={`Play ${active.title}`}
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 inline-flex h-16 w-16 items-center justify-center rounded-full bg-rose-600/95 text-white shadow-xl transition-transform duration-150 hover:scale-105 hover:bg-rose-500 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-400"
                >
                  <Play className="h-7 w-7 fill-current ml-0.5" />
                </button>

                <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8 pointer-events-none">
                  <h2 className="font-display text-2xl sm:text-4xl font-bold tracking-tight text-white max-w-3xl">
                    {active.title}
                  </h2>

                  <div className="mt-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-xs sm:text-sm text-zinc-300 tabular-nums">
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
                </div>
              </>
            )}
            </div>
          </div>

          {/* Streaming Server & Quality Switcher Bar */}
          <div className="border-b border-white/8 bg-[#141418] px-6 py-3.5 sm:px-8">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-medium text-zinc-300">
                  <Server className="h-4 w-4 text-rose-400 shrink-0" aria-hidden="true" />
                  <span>
                    {active.mediaType === 'tv'
                      ? `Servers · S${String(selectedSeason).padStart(2, '0')} E${String(
                          selectedEpisode
                        ).padStart(2, '0')}`
                      : 'Streaming Servers'}
                  </span>
                </div>

                {active.mediaType === 'tv' && nextEpisode !== null && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedEpisode(nextEpisode);
                      setTheaterMode('stream');
                    }}
                    className="inline-flex min-h-[32px] items-center gap-1 rounded-lg border border-rose-500/40 bg-rose-600/15 px-2.5 text-xs font-medium text-rose-200 hover:bg-rose-600/25 lg:hidden"
                  >
                    <span>Next Ep ({nextEpisode})</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {servers.map((srv) => {
                  const isActive =
                    theaterMode === 'stream' && !isUsingOriginal && activeEmbedServer?.id === srv.id;
                  return (
                    <button
                      key={srv.id}
                      type="button"
                      onClick={() => {
                        userPickedServerRef.current = true;
                        setActiveServerId(srv.id);
                        setTheaterMode('stream');
                      }}
                      className={`min-h-[36px] rounded-lg px-3 text-xs font-medium whitespace-nowrap transition-colors ${
                        isActive
                          ? 'bg-rose-600 text-white'
                          : 'border border-white/10 bg-[#09090B] text-zinc-300 hover:border-rose-500/50 hover:text-white'
                      }`}
                    >
                      {srv.name}
                    </button>
                  );
                })}

                {hasOriginalDirect && (
                  <button
                    type="button"
                    onClick={() => {
                      userPickedServerRef.current = true;
                      setActiveServerId('original');
                      setTheaterMode('stream');
                    }}
                    className={`min-h-[36px] rounded-lg px-3 text-xs font-medium whitespace-nowrap transition-colors ${
                      theaterMode === 'stream' && isUsingOriginal
                        ? 'bg-rose-600 text-white'
                        : 'border border-white/10 bg-[#09090B] text-zinc-300 hover:border-rose-500/50 hover:text-white'
                    }`}
                  >
                    Original Direct (Ad-Free)
                  </button>
                )}

                {isUsingOriginal && directStreams.length > 1 && (
                  <div className="flex items-center gap-1 pl-1 border-l border-white/10">
                    {directStreams.map((ds, idx) => (
                      <button
                        key={`${ds.resolution}-${idx}`}
                        type="button"
                        onClick={() => setActiveDirectIdx(idx)}
                        className={`min-h-[32px] rounded-md px-2 font-mono text-xs transition-colors ${
                          activeDirectIdx === idx
                            ? 'bg-white/15 text-white'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        {ds.resolution}p
                      </button>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    void handleToggleRotate();
                  }}
                  className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-3 text-xs font-medium whitespace-nowrap transition-colors ${
                    isCssRotated || isNativeLandscapeLocked
                      ? 'bg-rose-600 text-white'
                      : 'border border-white/10 bg-[#09090B] text-zinc-200 hover:border-rose-500/50 hover:text-white'
                  }`}
                >
                  {isCssRotated || isNativeLandscapeLocked ? (
                    <RotateCcw className="h-3.5 w-3.5" />
                  ) : (
                    <RotateCw className="h-3.5 w-3.5" />
                  )}
                  <span>{isCssRotated || isNativeLandscapeLocked ? 'Portrait' : 'Rotate'}</span>
                </button>

                {active.mediaType === 'tv' && nextEpisode !== null && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedEpisode(nextEpisode);
                      setTheaterMode('stream');
                    }}
                    className="hidden lg:inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-rose-500/40 bg-rose-600/15 px-3 text-xs font-medium text-rose-200 hover:bg-rose-600/25 whitespace-nowrap"
                  >
                    <span>Next Ep ({nextEpisode})</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                )}

                {(loading || streamLoading) && !hasOriginalDirect && servers.length === 0 && (
                  <span className="text-xs text-zinc-400">Connecting servers...</span>
                )}
              </div>
            </div>
          </div>

          {/* Body Content */}
          <div className="p-6 sm:p-8 space-y-8">
            {/* Primary Actions Bar */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={startStreaming}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-rose-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-rose-500 whitespace-nowrap"
              >
                <Play className="h-4 w-4 fill-current" />
                <span>
                  {theaterMode === 'stream'
                    ? active.mediaType === 'tv'
                      ? `Streaming S${selectedSeason} · E${selectedEpisode}`
                      : 'Streaming Now'
                    : active.mediaType === 'tv'
                      ? `Watch S${selectedSeason} · E${selectedEpisode}`
                      : 'Watch Movie Now'}
                </span>
              </button>

              {detail?.trailerUrl && (
                <button
                  type="button"
                  onClick={() =>
                    setTheaterMode((prev) => (prev === 'trailer' ? 'backdrop' : 'trailer'))
                  }
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 text-sm font-medium text-zinc-100 transition-colors hover:bg-white/10 whitespace-nowrap"
                >
                  <Film className="h-4 w-4" />
                  <span>{theaterMode === 'trailer' ? 'Close Trailer' : 'Watch Trailer'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => onToggleWatchlist(active)}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 text-sm font-medium text-zinc-100 transition-colors hover:bg-white/10 whitespace-nowrap"
              >
                {isSaved ? (
                  <Check className="h-4 w-4 text-rose-400" />
                ) : (
                  <Bookmark className="h-4 w-4" />
                )}
                <span>{isSaved ? 'Saved in Watchlist' : 'Add to Watchlist'}</span>
              </button>
            </div>

            {loading ? (
              <div className="space-y-4">
                <div className="h-4 w-3/4 animate-pulse rounded bg-zinc-800" />
                <div className="h-4 w-2/3 animate-pulse rounded bg-zinc-800" />
                <div className="h-24 w-full animate-pulse rounded-xl bg-zinc-900" />
              </div>
            ) : error ? (
              <p className="text-sm text-rose-300">{error}</p>
            ) : (
              <>
                {/* Synopsis & Genre line */}
                <div className="space-y-3">
                  {detail?.genres && detail.genres.length > 0 && (
                    <p className="text-xs font-medium text-zinc-400">
                      Genres: <span className="text-zinc-200">{detail.genres.join(' · ')}</span>
                    </p>
                  )}
                  <p className="max-w-3xl text-sm sm:text-base leading-relaxed text-zinc-300">
                    {detail?.description}
                  </p>
                </div>

                {/* Seasons & Episodes Navigator (Web Series) */}
                {detail?.mediaType === 'tv' && detail.seasons.length > 0 && (
                  <div className="border-t border-white/8 pt-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2">
                        <Tv className="h-4 w-4 text-rose-400" aria-hidden="true" />
                        <h3 className="font-display text-lg font-semibold text-white">
                          Seasons &amp; Episodes
                        </h3>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {detail.seasons.map((season, idx) => (
                          <button
                            key={`season-${season.se}-${idx}`}
                            type="button"
                            onClick={() => {
                              const eps = getEpisodesForSeason(season);
                              setSelectedSeason(season.se);
                              setSelectedEpisode(eps[0] ?? 1);
                            }}
                            className={`min-h-[36px] rounded-lg px-3 text-xs font-mono font-medium whitespace-nowrap transition-colors ${
                              selectedSeason === season.se
                                ? 'bg-rose-600 text-white'
                                : 'border border-white/10 bg-[#141418] text-zinc-300 hover:bg-white/10'
                            }`}
                          >
                            Season {season.se} ({getEpisodesForSeason(season).length} eps)
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4 md:grid-cols-5">
                      {episodeNumbers.map((epNum, idx) => {
                        const isSelected = selectedEpisode === epNum;
                        return (
                          <button
                            key={`ep-${selectedSeason}-${epNum}-${idx}`}
                            type="button"
                            onClick={() => {
                              setSelectedEpisode(epNum);
                              startStreaming();
                            }}
                            className={`flex min-h-[48px] items-center justify-between rounded-lg border px-3.5 py-2 text-left transition-colors ${
                              isSelected
                                ? 'border-rose-500 bg-rose-600/15 text-white'
                                : 'border-white/8 bg-[#141418] text-zinc-300 hover:border-white/20 hover:text-white'
                            }`}
                          >
                            <span className="font-mono text-xs font-medium tabular-nums">
                              S{String(selectedSeason).padStart(2, '0')} · E
                              {String(epNum).padStart(2, '0')}
                            </span>
                            <Play className="h-3.5 w-3.5 shrink-0 opacity-75" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Cast & Crew */}
                {detail?.cast && detail.cast.length > 0 && (
                  <div className="border-t border-white/8 pt-6">
                    <h3 className="font-display text-lg font-semibold text-white mb-4">
                      Cast &amp; Credits
                    </h3>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                      {detail.cast.slice(0, 8).map((person, idx) => (
                        <div
                          key={`${person.staffId}-${idx}`}
                          className="flex items-center gap-3 rounded-xl border border-white/8 bg-[#141418] p-2.5"
                        >
                          <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-zinc-900">
                            {person.avatarUrl ? (
                              <MediaImage
                                src={person.avatarUrl}
                                alt={person.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center font-display text-sm font-semibold text-zinc-400">
                                {person.name.charAt(0)}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-zinc-100 truncate">
                              {person.name}
                            </p>
                            {person.character && (
                              <p className="text-xs text-zinc-400 truncate">{person.character}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Related Titles */}
                {related.length > 0 && (
                  <div className="border-t border-white/8 pt-6">
                    <h3 className="font-display text-lg font-semibold text-white mb-4">
                      Similar Titles
                    </h3>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                      {related.slice(0, 4).map((rel, idx) => (
                        <MediaCard
                          key={`related-${rel.id}-${idx}`}
                          item={rel}
                          isSaved={watchlistIds.has(rel.id)}
                          onSelect={onSelectItem}
                          onToggleWatchlist={onToggleWatchlist}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
