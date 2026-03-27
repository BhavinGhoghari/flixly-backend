const axios = require("axios");
const Movie = require("../models/Movie");

const TMDB_BASE = process.env.TMDB_BASE_URL || "https://api.themoviedb.org/3";
const TMDB_KEY = process.env.TMDB_API_KEY;
const IMG = "https://image.tmdb.org/t/p";

const tmdbGet = (path, params = {}) =>
  axios.get(`${TMDB_BASE}${path}`, {
    params: { api_key: TMDB_KEY, ...params },
  });

/**
 * Imports a movie or series from TMDB into the local MongoDB database.
 * @param {string|number} tmdbId - The TMDB ID of the title.
 * @param {string} mediaType - 'movie' or 'series'.
 * @returns {Promise<Object>} - The saved movie document.
 */
async function importMovieFromTMDB(tmdbId, mediaType) {
  const imdbId = `tmdb_${mediaType}_${tmdbId}`;
  
  // Check if already exists
  let movie = await Movie.findOne({ imdbId });
  if (movie) return movie;

  const isMovie = mediaType === "movie";
  const [detailRes, creditsRes, videosRes] = await Promise.all([
    tmdbGet(`/${isMovie ? "movie" : "tv"}/${tmdbId}`),
    tmdbGet(`/${isMovie ? "movie" : "tv"}/${tmdbId}/credits`),
    tmdbGet(`/${isMovie ? "movie" : "tv"}/${tmdbId}/videos`),
  ]);

  const d = detailRes.data;
  const trailer = (videosRes.data.results || []).find(
    (v) => v.type === "Trailer" && v.site === "YouTube"
  );

  const movieData = {
    title: isMovie ? d.title : d.name,
    type: isMovie ? "movie" : "series",
    description: d.overview,
    genre: d.genres?.map((g) => g.name) || [],
    releaseYear:
      parseInt((d.release_date || d.first_air_date || "0").split("-")[0]) ||
      null,
    duration: isMovie
      ? d.runtime
        ? `${Math.floor(d.runtime / 60)}h ${d.runtime % 60}m`
        : ""
      : `S1${(d.number_of_seasons || 1) > 1 ? `–S${d.number_of_seasons}` : ""}`,
    rating: d.vote_average ? Math.round(d.vote_average * 10) / 10 : 0,
    director: isMovie
      ? creditsRes.data.crew?.find((c) => c.job === "Director")?.name || ""
      : d.created_by?.[0]?.name || "",
    language: (d.original_language || "en").toUpperCase(),
    country: isMovie
      ? d.production_countries?.[0]?.name || ""
      : d.origin_country?.[0] || "",
    ageRating: d.adult ? "R" : isMovie ? "PG-13" : "TV-14",
    trailerUrl: trailer
      ? `https://www.youtube.com/watch?v=${trailer.key}`
      : "",
    posterUrl: d.poster_path ? `${IMG}/w500${d.poster_path}` : "",
    backdropUrl: d.backdrop_path ? `${IMG}/original${d.backdrop_path}` : "",
    cast:
      creditsRes.data.cast
        ?.slice(0, 10)
        .map((c) => ({ name: c.name, role: c.character })) || [],
    totalSeasons: isMovie ? undefined : d.number_of_seasons,
    totalEpisodes: isMovie ? undefined : d.number_of_episodes,
    imdbId,
    status: "active",
  };

  movie = new Movie(movieData);
  await movie.save();
  return movie;
}

module.exports = {
  importMovieFromTMDB,
  tmdbGet
};
