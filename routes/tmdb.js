const express = require("express");
const router = require("express").Router();
const Movie = require("../models/Movie");
const { adminAuth } = require("../middleware/auth");
const { tmdbGet, importMovieFromTMDB } = require("../utils/movieUtils");
const NodeCache = require("node-cache");

// Cache for 1 hour, check expired every 10 mins
const tmdbCache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });

const IMG = "https://image.tmdb.org/t/p";

const LANG_MAP = {
  en: "English",
  hi: "Hindi",
  fr: "French",
  de: "German",
  es: "Spanish",
  it: "Italian",
  ja: "Japanese",
  ko: "Korean",
  zh: "Mandarin",
  pt: "Portuguese",
  ru: "Russian",
  ar: "Arabic",
  ta: "Tamil",
  te: "Telugu",
  ml: "Malayalam",
  bn: "Bengali",
  mr: "Marathi",
  pa: "Punjabi",
  gu: "Gujarati",
  kn: "Kannada",
  th: "Thai",
  tr: "Turkish",
  nl: "Dutch",
  sv: "Swedish",
  da: "Danish",
  no: "Norwegian",
  fi: "Finnish",
  pl: "Polish",
  cs: "Czech",
  hu: "Hungarian",
  ro: "Romanian",
  uk: "Ukrainian",
  id: "Indonesian",
  ms: "Malay",
  vi: "Vietnamese",
  fa: "Persian",
  he: "Hebrew",
};
const langName = (code) => LANG_MAP[code] || (code || "").toUpperCase();

const PLATFORM_LOGOS = {
  Netflix:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Netflix_2015_logo.svg/100px-Netflix_2015_logo.svg.png",
  "Amazon Prime Video":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/Amazon_Prime_Video_logo.svg/100px-Amazon_Prime_Video_logo.svg.png",
  "Disney Plus":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Disney%2B_logo.svg/100px-Disney%2B_logo.svg.png",
  "HBO Max":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/1/17/HBO_Max_Logo.svg/100px-HBO_Max_Logo.svg.png",
  Hulu: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Hulu_Logo.svg/100px-Hulu_Logo.svg.png",
  "Apple TV Plus":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/2/28/Apple_TV_Plus_Logo.svg/100px-Apple_TV_Plus_Logo.svg.png",
  Hotstar:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Disney%2B_Hotstar_logo.svg/100px-Disney%2B_Hotstar_logo.svg.png",
  Peacock:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/NBCUniversal_Peacock_Logo.svg/100px-NBCUniversal_Peacock_Logo.svg.png",
  "Paramount Plus":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Paramount_Plus_logo.svg/100px-Paramount_Plus_logo.svg.png",
  Crunchyroll:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Crunchyroll_Logo.svg/100px-Crunchyroll_Logo.svg.png",
};

function normalizeTMDBList(data, type) {
  return {
    results: (data.results || []).map((item) => ({
      tmdbId: item.id,
      title: type === "movie" ? item.title : item.name,
      type,
      posterUrl: item.poster_path ? `${IMG}/w500${item.poster_path}` : "",
      backdropUrl: item.backdrop_path
        ? `${IMG}/original${item.backdrop_path}`
        : "",
      rating: item.vote_average ? Math.round(item.vote_average * 10) / 10 : 0,
      releaseYear: (item.release_date || item.first_air_date || "").split(
        "-",
      )[0],
      description: item.overview || "",
      genre: item.genre_ids || [],
    })),
    total_pages: data.total_pages,
    total_results: data.total_results,
    page: data.page,
  };
}

function buildCastItem(c) {
  return {
    id: c.id,
    name: c.name,
    role: c.character || c.roles?.[0]?.character || "",
    profileUrl: c.profile_path ? `${IMG}/w185${c.profile_path}` : "",
    profileUrlLg: c.profile_path ? `${IMG}/w342${c.profile_path}` : "",
    order: c.order ?? 999,
    department: c.known_for_department || "",
  };
}

async function getWatchProviders(mediaType, id) {
  try {
    const { data } = await tmdbGet(`/${mediaType}/${id}/watch/providers`);
    const results = data.results || {};
    // Try IN first, then US
    const region =
      results["IN"] || results["US"] || Object.values(results)[0] || {};
    const flatrate = (region.flatrate || []).map((p) => ({
      name: p.provider_name,
      logoUrl: p.logo_path ? `${IMG}/w92${p.logo_path}` : "",
    }));
    const rent = (region.rent || []).map((p) => ({
      name: p.provider_name,
      logoUrl: p.logo_path ? `${IMG}/w92${p.logo_path}` : "",
    }));
    const buy = (region.buy || []).map((p) => ({
      name: p.provider_name,
      logoUrl: p.logo_path ? `${IMG}/w92${p.logo_path}` : "",
    }));
    return { flatrate, rent, buy };
  } catch {
    return { flatrate: [], rent: [], buy: [] };
  }
}

router.get("/movies/popular", async (req, res) => {
  try {
    const cacheKey = `popular_movies_${req.query.page || 1}`;
    if (tmdbCache.has(cacheKey)) {
      return res.json(tmdbCache.get(cacheKey));
    }
    const { data } = await tmdbGet("/movie/popular", {
      page: req.query.page || 1,
    });
    const result = normalizeTMDBList(data, "movie");
    tmdbCache.set(cacheKey, result);
    res.json(result);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});
router.get("/movies/top_rated", async (req, res) => {
  try {
    const { data } = await tmdbGet("/movie/top_rated", {
      page: req.query.page || 1,
    });
    res.json(normalizeTMDBList(data, "movie"));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});
router.get("/movies/upcoming", async (req, res) => {
  try {
    const cacheKey = `upcoming_movies_${req.query.page || 1}`;
    if (tmdbCache.has(cacheKey)) {
      return res.json(tmdbCache.get(cacheKey));
    }
    const { data } = await tmdbGet("/movie/upcoming", {
      page: req.query.page || 1,
    });
    const result = normalizeTMDBList(data, "movie");
    tmdbCache.set(cacheKey, result);
    res.json(result);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});
router.get("/movies/now_playing", async (req, res) => {
  try {
    const { data } = await tmdbGet("/movie/now_playing", {
      page: req.query.page || 1,
    });
    res.json(normalizeTMDBList(data, "movie"));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/series/popular", async (req, res) => {
  try {
    const cacheKey = `popular_series_${req.query.page || 1}`;
    if (tmdbCache.has(cacheKey)) {
      return res.json(tmdbCache.get(cacheKey));
    }
    const { data } = await tmdbGet("/tv/popular", {
      page: req.query.page || 1,
    });
    const result = normalizeTMDBList(data, "series");
    tmdbCache.set(cacheKey, result);
    res.json(result);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});
router.get("/series/top_rated", async (req, res) => {
  try {
    const { data } = await tmdbGet("/tv/top_rated", {
      page: req.query.page || 1,
    });
    res.json(normalizeTMDBList(data, "series"));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});
router.get("/series/on_the_air", async (req, res) => {
  try {
    const { data } = await tmdbGet("/tv/on_the_air", {
      page: req.query.page || 1,
    });
    res.json(normalizeTMDBList(data, "series"));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/search", async (req, res) => {
  try {
    const { query, page = 1, type = "all" } = req.query;
    if (!query)
      return res.json({ results: [], total_pages: 0, total_results: 0 });
    let results = [],
      total_pages = 0,
      total_results = 0;
    if (type === "movie" || type === "all") {
      const { data } = await tmdbGet("/search/movie", { query, page });
      results = [...results, ...normalizeTMDBList(data, "movie").results];
      total_pages = Math.max(total_pages, data.total_pages);
      total_results += data.total_results;
    }
    if (type === "series" || type === "all") {
      const { data } = await tmdbGet("/search/tv", { query, page });
      results = [...results, ...normalizeTMDBList(data, "series").results];
      total_pages = Math.max(total_pages, data.total_pages);
      total_results += data.total_results;
    }
    res.json({ results, total_pages, total_results });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/movie/:id", async (req, res) => {
  try {
    let { id } = req.params;

    // Find local movie to get local ratings
    const localMovie = await Movie.findOne({
      $or: [{ imdbId: `tmdb_movie_${id}` }, { imdbId: id }],
    });

    const cacheKey = `movie_detail_${id}`;
    if (tmdbCache.has(cacheKey)) {
      return res.json(tmdbCache.get(cacheKey));
    }

    const [detailRes, creditsRes, videosRes, providers] = await Promise.all([
      tmdbGet(`/movie/${id}`, {
        append_to_response: "keywords,release_dates,alternative_titles,recommendations",
      }),
      tmdbGet(`/movie/${id}/credits`),
      tmdbGet(`/movie/${id}/videos`),
      getWatchProviders("movie", id),
    ]);
    const d = detailRes.data;
    const trailer =
      (videosRes.data.results || []).find(
        (v) => v.type === "Trailer" && v.site === "YouTube",
      ) || (videosRes.data.results || []).find((v) => v.site === "YouTube");

    // Certification / age rating
    const releaseDates = d.release_dates?.results || [];
    const usRelease = releaseDates.find((r) => r.iso_3166_1 === "US");
    const inRelease = releaseDates.find((r) => r.iso_3166_1 === "IN");
    const cert =
      (usRelease || inRelease)?.release_dates?.find((r) => r.certification)
        ?.certification || (d.adult ? "R" : "PG-13");

    // Dubbed languages from alternative titles / spoken_languages
    const spokenLangs = (d.spoken_languages || [])
      .map((l) => langName(l.iso_639_1))
      .filter(Boolean);

    const director = creditsRes.data.crew?.find((c) => c.job === "Director");
    const writers = creditsRes.data.crew
      ?.filter((c) => ["Writer", "Screenplay", "Story"].includes(c.job))
      .slice(0, 3);
    const allCast = (creditsRes.data.cast || []).map(buildCastItem);

    const result = {
      tmdbId: d.id,
      title: d.title,
      originalTitle: d.original_title !== d.title ? d.original_title : "",
      type: "movie",
      description: d.overview,
      genre: d.genres?.map((g) => g.name) || [],
      releaseYear: d.release_date
        ? parseInt(d.release_date.split("-")[0])
        : null,
      releaseDate: d.release_date || "",
      runtime: d.runtime || null,
      duration: d.runtime
        ? `${Math.floor(d.runtime / 60)}h ${d.runtime % 60}m`
        : null,
      rating: d.vote_average ? Math.round(d.vote_average * 10) / 10 : 0,
      voteCount: d.vote_count || 0,
      director: director?.name || "",
      directorId: director?.id || null,
      writers:
        writers?.map((w) => ({ name: w.name, id: w.id, job: w.job })) || [],
      language: langName(d.original_language),
      spokenLanguages: spokenLangs,
      country: d.production_countries?.map((c) => c.name).join(", ") || "",
      productionCompanies:
        d.production_companies?.slice(0, 4).map((c) => ({
          name: c.name,
          logoUrl: c.logo_path ? `${IMG}/w92${c.logo_path}` : "",
        })) || [],
      ageRating: cert,
      budget: d.budget || 0,
      revenue: d.revenue || 0,
      status: d.status || "Released",
      tagline: d.tagline || "",
      trailerUrl: trailer
        ? `https://www.youtube.com/watch?v=${trailer.key}`
        : "",
      posterUrl: d.poster_path ? `${IMG}/w500${d.poster_path}` : "",
      backdropUrl: d.backdrop_path ? `${IMG}/original${d.backdrop_path}` : "",
      cast: allCast.slice(0, 12),
      allCast,
      keywords: d.keywords?.keywords?.map((k) => k.name) || [],
      imdbId: d.imdb_id || "",
      watchProviders: providers,
      averageUserRating: localMovie?.averageUserRating || 0,
      totalReviews: localMovie?.totalReviews || 0,
      recommendations: normalizeTMDBList(d.recommendations || {}, "movie").results,
    };
    tmdbCache.set(cacheKey, result);
    res.json(result);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/series/:id", async (req, res) => {
  try {
    const { id } = req.params;
    // Find local movie to get local ratings
    const localMovie = await Movie.findOne({
      $or: [{ imdbId: `tmdb_series_${id}` }, { imdbId: id }],
    });

    const cacheKey = `series_detail_${id}`;
    if (tmdbCache.has(cacheKey)) {
      return res.json(tmdbCache.get(cacheKey));
    }

    const [detailRes, creditsRes, videosRes, providers] = await Promise.all([
      tmdbGet(`/tv/${id}`, { append_to_response: "keywords,content_ratings,recommendations" }),
      tmdbGet(`/tv/${id}/credits`).catch(() => ({ data: { cast: [] } })),
      tmdbGet(`/tv/${id}/videos`).catch(() => ({ data: { results: [] } })),
      getWatchProviders("tv", id),
    ]);
    const d = detailRes.data;
    const trailer =
      (videosRes.data.results || []).find(
        (v) => v.type === "Trailer" && v.site === "YouTube",
      ) || (videosRes.data.results || []).find((v) => v.site === "YouTube");

    const ratings = d.content_ratings?.results || [];
    const usRating = ratings.find((r) => r.iso_3166_1 === "US");
    const inRating = ratings.find((r) => r.iso_3166_1 === "IN");
    const cert = (usRating || inRating)?.rating || "TV-14";
    const spokenLangs = (d.spoken_languages || [])
      .map((l) => langName(l.iso_639_1))
      .filter(Boolean);
    const allCast = (creditsRes.data.cast || []).map(buildCastItem);

    const result = {
      tmdbId: d.id,
      title: d.name,
      originalTitle: d.original_name !== d.name ? d.original_name : "",
      type: "series",
      description: d.overview,
      genre: d.genres?.map((g) => g.name) || [],
      releaseYear: d.first_air_date
        ? parseInt(d.first_air_date.split("-")[0])
        : null,
      releaseDate: d.first_air_date || "",
      lastAirDate: d.last_air_date || "",
      duration: `S1${(d.number_of_seasons || 1) > 1 ? `–S${d.number_of_seasons}` : ""}`,
      episodeRuntime: d.episode_run_time?.[0]
        ? `${d.episode_run_time[0]} min / ep`
        : null,
      rating: d.vote_average ? Math.round(d.vote_average * 10) / 10 : 0,
      voteCount: d.vote_count || 0,
      director: d.created_by?.[0]?.name || "",
      directorId: d.created_by?.[0]?.id || null,
      createdBy: d.created_by?.map((c) => ({ name: c.name, id: c.id })) || [],
      language: langName(d.original_language),
      spokenLanguages: spokenLangs,
      country: d.origin_country?.join(", ") || "",
      productionCompanies:
        d.production_companies?.slice(0, 4).map((c) => ({
          name: c.name,
          logoUrl: c.logo_path ? `${IMG}/w92${c.logo_path}` : "",
        })) || [],
      ageRating: cert,
      tagline: d.tagline || "",
      airStatus: d.status || "",
      networks:
        d.networks?.map((n) => ({
          name: n.name,
          logoUrl: n.logo_path ? `${IMG}/w92${n.logo_path}` : "",
        })) || [],
      trailerUrl: trailer
        ? `https://www.youtube.com/watch?v=${trailer.key}`
        : "",
      posterUrl: d.poster_path ? `${IMG}/w500${d.poster_path}` : "",
      backdropUrl: d.backdrop_path ? `${IMG}/original${d.backdrop_path}` : "",
      cast: allCast.slice(0, 12),
      allCast,
      keywords: d.keywords?.results?.map((k) => k.name) || [],
      totalSeasons: d.number_of_seasons || 1,
      totalEpisodes: d.number_of_episodes || null,
      watchProviders: providers,
      averageUserRating: localMovie?.averageUserRating || 0,
      revenue: d.revenue || localMovie?.revenue || 0,
      recommendations: normalizeTMDBList(d.recommendations || {}, "series").results,
    };
    tmdbCache.set(cacheKey, result);
    res.json(result);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/cast/:mediaType/:id", async (req, res) => {
  try {
    const { mediaType, id } = req.params;
    const endpoint = mediaType === "series" ? "tv" : "movie";
    const { data } = await tmdbGet(`/${endpoint}/${id}/credits`);
    const cast = (data.cast || []).map(buildCastItem);
    const crew = (data.crew || []).map((c) => ({
      id: c.id,
      name: c.name,
      job: c.job,
      department: c.department,
      profileUrl: c.profile_path ? `${IMG}/w185${c.profile_path}` : "",
    }));
    res.json({ cast, crew });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/actor/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [personRes, creditsMovieRes, creditsTVRes, imagesRes] =
      await Promise.all([
        tmdbGet(`/person/${id}`),
        tmdbGet(`/person/${id}/movie_credits`),
        tmdbGet(`/person/${id}/tv_credits`),
        tmdbGet(`/person/${id}/images`),
      ]);
    const p = personRes.data;

    const movieCredits = (creditsMovieRes.data.cast || [])
      .filter((m) => m.poster_path)
      .sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0))
      .slice(0, 24)
      .map((m) => ({
        tmdbId: m.id,
        title: m.title,
        type: "movie",
        posterUrl: m.poster_path ? `${IMG}/w342${m.poster_path}` : "",
        rating: m.vote_average ? Math.round(m.vote_average * 10) / 10 : 0,
        releaseYear: (m.release_date || "").split("-")[0],
        role: m.character,
      }));

    const tvCredits = (creditsTVRes.data.cast || [])
      .filter((t) => t.poster_path)
      .sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0))
      .slice(0, 24)
      .map((t) => ({
        tmdbId: t.id,
        title: t.name,
        type: "series",
        posterUrl: t.poster_path ? `${IMG}/w342${t.poster_path}` : "",
        rating: t.vote_average ? Math.round(t.vote_average * 10) / 10 : 0,
        releaseYear: (t.first_air_date || "").split("-")[0],
        role: t.character,
      }));

    const photos = (imagesRes.data.profiles || []).slice(0, 12).map((img) => ({
      url: `${IMG}/w342${img.file_path}`,
      urlLg: `${IMG}/w780${img.file_path}`,
    }));

    // Calculate age
    let age = null;
    if (p.birthday) {
      const birth = new Date(p.birthday);
      const ref = p.deathday ? new Date(p.deathday) : new Date();
      age = Math.floor((ref - birth) / (365.25 * 24 * 60 * 60 * 1000));
    }

    res.json({
      id: p.id,
      name: p.name,
      biography: p.biography,
      birthday: p.birthday,
      deathday: p.deathday || null,
      age,
      placeOfBirth: p.place_of_birth,
      gender:
        p.gender === 1 ? "Female" : p.gender === 2 ? "Male" : "Non-binary",
      knownFor: p.known_for_department,
      popularity: p.popularity,
      profileUrl: p.profile_path ? `${IMG}/w342${p.profile_path}` : "",
      profileUrlLg: p.profile_path ? `${IMG}/w780${p.profile_path}` : "",
      imdbId: p.imdb_id,
      homepage: p.homepage,
      alsoKnownAs: p.also_known_as || [],
      photos,
      movieCredits,
      tvCredits,
      totalMovies: creditsMovieRes.data.cast?.length || 0,
      totalTV: creditsTVRes.data.cast?.length || 0,
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/genres/movie", async (req, res) => {
  try {
    const cacheKey = "genres_movie";
    if (tmdbCache.has(cacheKey)) return res.json(tmdbCache.get(cacheKey));
    const { data } = await tmdbGet("/genre/movie/list");
    tmdbCache.set(cacheKey, data.genres);
    res.json(data.genres);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});
router.get("/genres/tv", async (req, res) => {
  try {
    const cacheKey = "genres_tv";
    if (tmdbCache.has(cacheKey)) return res.json(tmdbCache.get(cacheKey));
    const { data } = await tmdbGet("/genre/tv/list");
    tmdbCache.set(cacheKey, data.genres);
    res.json(data.genres);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/discover/movie", async (req, res) => {
  try {
    const { genre, page = 1, sort = "popularity.desc", year } = req.query;
    const cacheKey = `discover_movie_${genre || "all"}_${page}_${sort}_${year || "all"}`;
    if (tmdbCache.has(cacheKey)) {
      return res.json(tmdbCache.get(cacheKey));
    }
    const params = { sort_by: sort, page };
    if (genre) params.with_genres = genre;
    if (year) params.primary_release_year = year;
    const { data } = await tmdbGet("/discover/movie", params);
    const result = normalizeTMDBList(data, "movie");
    tmdbCache.set(cacheKey, result);
    res.json(result);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});
router.get("/discover/tv", async (req, res) => {
  try {
    const { genre, page = 1, sort = "popularity.desc", year } = req.query;
    const cacheKey = `discover_tv_${genre || "all"}_${page}_${sort}_${year || "all"}`;
    if (tmdbCache.has(cacheKey)) {
      return res.json(tmdbCache.get(cacheKey));
    }
    const params = { sort_by: sort, page };
    if (genre) params.with_genres = genre;
    if (year) params.first_air_date_year = year;
    const { data } = await tmdbGet("/discover/tv", params);
    const result = normalizeTMDBList(data, "series");
    tmdbCache.set(cacheKey, result);
    res.json(result);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/trending", async (req, res) => {
  try {
    const { window = "week" } = req.query;
    const cacheKey = `trending_${window}`;
    if (tmdbCache.has(cacheKey)) {
      return res.json(tmdbCache.get(cacheKey));
    }
    const { data } = await tmdbGet(`/trending/all/${window}`);
    const results = data.results.map((item) => {
      const isMovie = item.media_type === "movie";
      return {
        tmdbId: item.id,
        title: isMovie ? item.title : item.name,
        type: isMovie ? "movie" : "series",
        posterUrl: item.poster_path ? `${IMG}/w500${item.poster_path}` : "",
        backdropUrl: item.backdrop_path
          ? `${IMG}/original${item.backdrop_path}`
          : "",
        rating: item.vote_average ? Math.round(item.vote_average * 10) / 10 : 0,
        releaseYear: (item.release_date || item.first_air_date || "").split(
          "-",
        )[0],
        description: item.overview,
        genre: [],
      };
    });
    const result = {
      results,
      total_pages: data.total_pages,
      total_results: data.total_results,
    };
    tmdbCache.set(cacheKey, result);
    res.json(result);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/import", adminAuth, async (req, res) => {
  try {
    const { tmdbId, mediaType } = req.body;
    const movie = await importMovieFromTMDB(tmdbId, mediaType);
    res.status(201).json({ message: "Imported successfully", movie });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;
