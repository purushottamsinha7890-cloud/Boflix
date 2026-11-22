export type MediaType = 'movie' | 'tv';

export interface GenreItem {
  tid: string;
  name: string;
  count: number;
}

export interface MediaItem {
  id: string;
  title: string;
  backdropPath: string;
  releaseYear: string;
  releaseDateRaw: string;
  mediaType: MediaType;
  voteAverage: string;
  country: string;
  genres: string[];
  genreIds: string[];
  info?: string;
}

export interface CastMember {
  staffId: string;
  name: string;
  character: string;
  avatarUrl: string;
}

export interface SeasonInfo {
  se: number;
  ep: number;
  allEp?: string;
}

export interface MediaDetail extends MediaItem {
  description: string;
  durationMinutes: number | null;
  trailerUrl: string;
  seasons: SeasonInfo[];
  cast: CastMember[];
  subjectId: string;
  tmdbId: string;
}

export interface CuratedCollection {
  id: string;
  title: string;
  subtitle: string;
  items: MediaItem[];
  totalResults: number;
}

export interface PagerInfo {
  currentPage: number;
  itemsPerPage: number;
  totalPages: number;
  totalResults: number;
}

export interface BrowseResponse {
  results: MediaItem[];
  pager: PagerInfo;
}

export interface HomeCatalogResponse {
  featured: MediaDetail | null;
  collections: CuratedCollection[];
  genres: GenreItem[];
  totalCatalogCount: number;
}

export interface BrowseFilters {
  page?: number;
  type?: 'all' | '1' | '2';
  genreId?: string;
  platform?: string;
  dubbing?: string;
  country?: string;
  sortBy?: 'date' | 'created' | 'rating';
}

export interface DirectStreamOption {
  resolution: string;
  url: string;
  format: string;
  size?: string;
}

export interface SubtitleTrack {
  lan: string;
  lanName: string;
  url: string;
}

export interface StreamServer {
  id: string;
  name: string;
  quality: string;
  embedUrl: string;
  hlsUrl?: string;
  hlsProxyUrl?: string;
}

export interface StreamResponse {
  tmdbId: string;
  subjectId: string;
  mediaType: MediaType;
  season: number;
  episode: number;
  directStreams: DirectStreamOption[];
  subtitles: SubtitleTrack[];
  servers: StreamServer[];
}

