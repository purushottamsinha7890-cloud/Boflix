export const GENERATED_ASSETS = {
  heroBackdrop: '/src/assets/images/hero_cinema_backdrop_1795284479986.jpg',
  noirSpotlight: '/src/assets/images/spotlight_series_noir_1795284479865.jpg',
  moviePosterFallback: '/src/assets/images/poster_fallback_movie_1795284479520.jpg',
  seriesPosterFallback: '/src/assets/images/poster_fallback_series_1795284479463.jpg',
} as const;

export const STREAMING_PLATFORMS = [
  { label: 'All Networks', value: '' },
  { label: 'Netflix', value: 'netflix' },
  { label: 'Prime Video', value: 'primeVideo' },
  { label: 'Disney+', value: 'disney' },
  { label: 'Apple TV+', value: 'appleTV' },
  { label: 'Zee5', value: 'zee5' },
  { label: 'Hulu', value: 'hulu' },
] as const;

export const DUBBING_OPTIONS = [
  { label: 'All Languages', value: '' },
  { label: 'Hindi', value: 'Hindi' },
  { label: 'English', value: 'English' },
  { label: 'Telugu', value: 'Telugu' },
  { label: 'Tamil', value: 'Tamil' },
  { label: 'Malayalam', value: 'Malayalam' },
  { label: 'Kannada', value: 'Kannada' },
] as const;

export const COUNTRY_OPTIONS = [
  { label: 'All Regions', value: '' },
  { label: 'India', value: 'India' },
  { label: 'United States', value: 'United States' },
  { label: 'South Korea', value: 'Korea' },
  { label: 'United Kingdom', value: 'United Kingdom' },
  { label: 'Japan', value: 'Japan' },
  { label: 'China', value: 'China' },
] as const;

export const SORT_OPTIONS = [
  { label: 'Release Date', value: 'date' },
  { label: 'Newly Added', value: 'created' },
  { label: 'Top Rated', value: 'rating' },
] as const;
