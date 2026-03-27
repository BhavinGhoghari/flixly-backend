require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Movie = require('./models/Movie');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/flixly';

const sampleMovies = [
  {
    title: "Oppenheimer",
    type: "movie",
    description: "The story of J. Robert Oppenheimer's role in the development of the atomic bomb during World War II. A theoretical physicist leads the Manhattan Project that forever changes warfare and the destiny of the world.",
    genre: ["Drama", "Biography", "History"],
    releaseYear: 2023,
    duration: "3h 0m",
    rating: 8.9,
    director: "Christopher Nolan",
    language: "English",
    country: "USA",
    ageRating: "R",
    trailerUrl: "https://www.youtube.com/watch?v=uYPbbksJxIg",
    posterUrl: "https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/rLb2cwF3Pazuxaj0sRXQ037tGI1.jpg",
    cast: [
      { name: "Cillian Murphy", role: "J. Robert Oppenheimer" },
      { name: "Emily Blunt", role: "Katherine Oppenheimer" },
      { name: "Matt Damon", role: "Leslie Groves" },
      { name: "Robert Downey Jr.", role: "Lewis Strauss" },
    ],
    tags: ["atomic bomb", "world war 2", "historical", "biographical"],
    featured: true,
    status: "active",
  },
  {
    title: "Dune: Part Two",
    type: "movie",
    description: "Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family. Facing a choice between the love of his life and the fate of the universe, he must prevent a terrible future only he can foresee.",
    genre: ["Sci-Fi", "Adventure", "Action"],
    releaseYear: 2024,
    duration: "2h 46m",
    rating: 8.5,
    director: "Denis Villeneuve",
    language: "English",
    country: "USA",
    ageRating: "PG-13",
    trailerUrl: "https://www.youtube.com/watch?v=Way9Dexny3w",
    posterUrl: "https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/xOMo8BRK7PfcJv9JCnx7s5hj0PX.jpg",
    cast: [
      { name: "Timothée Chalamet", role: "Paul Atreides" },
      { name: "Zendaya", role: "Chani" },
      { name: "Rebecca Ferguson", role: "Lady Jessica" },
    ],
    tags: ["sci-fi", "desert", "epic", "space"],
    featured: false,
    status: "active",
  },
  {
    title: "Killers of the Flower Moon",
    type: "movie",
    description: "Members of the Osage Nation are murdered under mysterious circumstances in the 1920s, sparking a major FBI investigation involving the exploitation of oil-rich Native Americans.",
    genre: ["Crime", "Drama", "Biography"],
    releaseYear: 2023,
    duration: "3h 26m",
    rating: 7.6,
    director: "Martin Scorsese",
    language: "English",
    country: "USA",
    ageRating: "R",
    trailerUrl: "https://www.youtube.com/watch?v=EP34Yoxs3FQ",
    posterUrl: "https://image.tmdb.org/t/p/w500/dB6Krk806zeqd0YNp2ngQ9zXteH.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/1X7vow16X7CnCoexXh4H4F2yDJv.jpg",
    cast: [
      { name: "Leonardo DiCaprio", role: "Ernest Burkhart" },
      { name: "Robert De Niro", role: "William Hale" },
      { name: "Lily Gladstone", role: "Mollie Burkhart" },
    ],
    tags: ["native american", "crime", "historical", "fbi"],
    status: "active",
  },
  {
    title: "Poor Things",
    type: "movie",
    description: "The incredible tale about the fantastical evolution of Bella Baxter, a young woman brought back to life by the brilliant and unorthodox scientist Dr. Godwin Baxter.",
    genre: ["Fantasy", "Comedy", "Drama"],
    releaseYear: 2023,
    duration: "2h 21m",
    rating: 8.0,
    director: "Yorgos Lanthimos",
    language: "English",
    country: "UK",
    ageRating: "R",
    trailerUrl: "https://www.youtube.com/watch?v=RlbR5N6veqw",
    posterUrl: "https://image.tmdb.org/t/p/w500/kCGlIMHnOm8JPXIf2ZjyClb1lZY.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/bQXAqRx2Fgc46uCVWgoPz5L5Dtr.jpg",
    cast: [
      { name: "Emma Stone", role: "Bella Baxter" },
      { name: "Mark Ruffalo", role: "Duncan Wedderburn" },
    ],
    tags: ["surreal", "feminist", "gothic", "dark comedy"],
    status: "active",
  },
  {
    title: "The Dark Knight",
    type: "movie",
    description: "When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.",
    genre: ["Action", "Crime", "Drama"],
    releaseYear: 2008,
    duration: "2h 32m",
    rating: 9.0,
    director: "Christopher Nolan",
    language: "English",
    country: "USA",
    ageRating: "PG-13",
    trailerUrl: "https://www.youtube.com/watch?v=EXeTwQWrcwY",
    posterUrl: "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/nMKdUUepR0i5zn0y1T4CejMGeVU.jpg",
    cast: [
      { name: "Christian Bale", role: "Batman / Bruce Wayne" },
      { name: "Heath Ledger", role: "The Joker" },
      { name: "Aaron Eckhart", role: "Harvey Dent" },
    ],
    tags: ["batman", "dc", "superhero", "crime", "classic"],
    status: "active",
  },
  {
    title: "Inception",
    type: "movie",
    description: "A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O., but his tragic past may doom the project and his team to disaster.",
    genre: ["Action", "Sci-Fi", "Thriller"],
    releaseYear: 2010,
    duration: "2h 28m",
    rating: 8.8,
    director: "Christopher Nolan",
    language: "English",
    country: "USA",
    ageRating: "PG-13",
    trailerUrl: "https://www.youtube.com/watch?v=YoHD9XEInc0",
    posterUrl: "https://image.tmdb.org/t/p/w500/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/s3TBrRGB1iav7gFOCNx3H31MoES.jpg",
    cast: [
      { name: "Leonardo DiCaprio", role: "Dom Cobb" },
      { name: "Joseph Gordon-Levitt", role: "Arthur" },
      { name: "Elliot Page", role: "Ariadne" },
    ],
    tags: ["mind-bending", "dreams", "heist", "sci-fi"],
    status: "active",
  },
  // SERIES
  {
    title: "Breaking Bad",
    type: "series",
    description: "A high school chemistry teacher diagnosed with inoperable lung cancer turns to manufacturing and selling methamphetamine in order to secure his family's future.",
    genre: ["Crime", "Drama", "Thriller"],
    releaseYear: 2008,
    duration: "S1–S5",
    rating: 9.5,
    director: "Vince Gilligan",
    language: "English",
    country: "USA",
    ageRating: "TV-MA",
    trailerUrl: "https://www.youtube.com/watch?v=HhesaQXLuRY",
    posterUrl: "https://image.tmdb.org/t/p/w500/ggFHVNu6YYI5L9pCfOacjizRGt.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/tsRy63Mu5cu8etL1X7ZLyf7UP1M.jpg",
    cast: [
      { name: "Bryan Cranston", role: "Walter White" },
      { name: "Aaron Paul", role: "Jesse Pinkman" },
      { name: "Anna Gunn", role: "Skyler White" },
    ],
    totalSeasons: 5,
    totalEpisodes: 62,
    tags: ["drugs", "crime", "transformation", "new mexico"],
    featured: true,
    status: "active",
  },
  {
    title: "The Last of Us",
    type: "series",
    description: "Joel, a hardened survivor, is hired to smuggle Ellie, a 14-year-old girl, out of a quarantine zone. What starts as a small job soon becomes a brutal, heartbreaking journey as they both must traverse the US and depend on each other for survival.",
    genre: ["Drama", "Action", "Horror"],
    releaseYear: 2023,
    duration: "S1–S2",
    rating: 8.8,
    director: "Craig Mazin",
    language: "English",
    country: "USA",
    ageRating: "TV-MA",
    trailerUrl: "https://www.youtube.com/watch?v=uLtkt8BonwM",
    posterUrl: "https://image.tmdb.org/t/p/w500/uKvVjHNqB5VmOrdxqAt2F7J78ED.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/oezFHFtdRC8Pek0efqbkBgfSFqe.jpg",
    cast: [
      { name: "Pedro Pascal", role: "Joel Miller" },
      { name: "Bella Ramsey", role: "Ellie Williams" },
    ],
    totalSeasons: 2,
    totalEpisodes: 16,
    tags: ["post-apocalyptic", "survival", "video game", "zombie"],
    status: "active",
  },
  {
    title: "Succession",
    type: "series",
    description: "The Roy family is known for controlling the biggest media and entertainment company in the world. However, their world changes when their father steps down from the company.",
    genre: ["Drama", "Comedy"],
    releaseYear: 2018,
    duration: "S1–S4",
    rating: 8.9,
    director: "Jesse Armstrong",
    language: "English",
    country: "USA",
    ageRating: "TV-MA",
    trailerUrl: "https://www.youtube.com/watch?v=OzYxJV_rmE8",
    posterUrl: "https://image.tmdb.org/t/p/w500/7HW47XbkNQ5fiwQFYGWdw9gs144.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/bGZn5RVzMMXju4ev52k4E8yQN9x.jpg",
    cast: [
      { name: "Brian Cox", role: "Logan Roy" },
      { name: "Jeremy Strong", role: "Kendall Roy" },
      { name: "Sarah Snook", role: "Siobhan Roy" },
    ],
    totalSeasons: 4,
    totalEpisodes: 39,
    tags: ["family", "media", "power", "wealth", "satire"],
    status: "active",
  },
  {
    title: "Stranger Things",
    type: "series",
    description: "When a young boy disappears, his mother, a police chief and his friends must confront terrifying supernatural forces in order to get him back in the small town of Hawkins, Indiana.",
    genre: ["Sci-Fi", "Horror", "Drama"],
    releaseYear: 2016,
    duration: "S1–S4",
    rating: 8.7,
    director: "The Duffer Brothers",
    language: "English",
    country: "USA",
    ageRating: "TV-14",
    trailerUrl: "https://www.youtube.com/watch?v=b9EkMc79ZSU",
    posterUrl: "https://image.tmdb.org/t/p/w500/49WJfeN0moxb9IPfGn8AIqMGskD.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/rcA17r3ZNMnxqKEWl3C0OkDhUB8.jpg",
    cast: [
      { name: "Millie Bobby Brown", role: "Eleven" },
      { name: "Finn Wolfhard", role: "Mike Wheeler" },
      { name: "Winona Ryder", role: "Joyce Byers" },
    ],
    totalSeasons: 4,
    totalEpisodes: 34,
    tags: ["80s", "supernatural", "kids", "demogorgon", "upside-down"],
    status: "active",
  },
];

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // Clear existing
    await User.deleteMany({});
    await Movie.deleteMany({});
    console.log('Cleared existing data');

    // Create admin
    const admin = new User({
      name: 'Admin',
      email: 'admin@flixly.com',
      password: 'admin123',
      role: 'admin',
    });
    await admin.save();
    console.log('✅ Admin created: admin@flixly.com / admin123');

    // Create test user
    const user = new User({
      name: 'Test User',
      email: 'user@flixly.com',
      password: 'user123',
      role: 'user',
    });
    await user.save();
    console.log('✅ User created: user@flixly.com / user123');

    // Seed movies
    await Movie.insertMany(sampleMovies);
    console.log(`✅ ${sampleMovies.length} movies/series seeded`);

    console.log('\n🎬 Flixly database seeded successfully!\n');
    console.log('Admin login:  admin@flixly.com / admin123');
    console.log('User login:   user@flixly.com / user123\n');
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
}

seed();
