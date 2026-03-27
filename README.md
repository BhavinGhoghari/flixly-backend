# 🚀 Flixly Backend — Node.js API Service

The backend for Flixly acts as a secure proxy to the TMDB API, handles user authentication (JWT), manages a MongoDB database for local library imports, and provides a robust API for the React frontend.

## 🛠️ Tech Stack
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB (via Mongoose)
- **Authentication:** JSON Web Tokens (JWT)
- **API Client:** Axios (for TMDB proxying)

## 📁 Structure
- `/models`: Mongoose schemas for `User`, `Movie`, and `Review`.
- `/routes`: 
    - `auth.js`: Registration and login.
    - `tmdb.js`: Proxy routes for all TMDB data (Movies, Series, Search, Trending, etc.).
    - `movies.js`: CRUD for the local imported library.
    - `reviews.js`: User reviews and rating system.
- `/middleware`: Authentication guards.

## ⚙️ Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables (.env)
Create a `.env` file in this directory:
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/flixly
JWT_SECRET=your_secret_key
TMDB_API_KEY=your_tmdb_v3_api_key
TMDB_BASE_URL=https://api.themoviedb.org/3
```

### 3. Seed Database
This creates an admin account (`admin@flixly.com` / `admin123`) and a test user.
```bash
node seed.js
```

### 4. Run Server
```bash
# Development (with nodemon)
npm run dev

# Production
npm start
```

## 🌐 API Key Security
All TMDB requests are proxied through this backend. This ensures your **TMDB API Key** is never exposed to the frontend/client.

## 🎬 Key Endpoints
- `GET /tmdb/trending`: Fetch trending media.
- `GET /tmdb/movies/popular`: Popular movie list.
- `GET /tmdb/movie/:id`: Rich movie details incl. cast & trailer.
- `POST /tmdb/import`: (Admin only) Import a TMDB title to the local DB.
