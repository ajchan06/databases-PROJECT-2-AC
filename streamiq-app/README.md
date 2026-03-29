# StreamIQ — CS3200 Project 2
### Node + Express + MongoDB Application

A full-stack CRUD web application for the **StreamIQ** music streaming platform, built as Part 6 of CS3200 Project 2. The app manages the three MongoDB collections defined in this project and supports Create, Read, Update, and Delete operations on all of them.

---

## 📁 Project Structure

```
streamiq-app/
├── app.js                  # Express server + MongoDB connection
├── package.json
├── routes/
│   ├── users.js            # CRUD + tier toggle for users collection
│   ├── artists.js          # CRUD + isExplicit toggle for artists collection
│   └── history.js          # CRUD + per-user count for listenHistory collection
├── public/
│   └── index.html          # Single-page frontend (zero dependencies)
└── README.md
```

---

## 🗃️ Collections Used

All three collections from the project data files are wired up:

| Collection | Route Prefix | Description |
|---|---|---|
| `users` | `/api/users` | User accounts with embedded playlists, followedArtists, listeningSnapshots |
| `artists` | `/api/artists` | Artists with embedded albums and songs |
| `listenHistory` | `/api/history` | Individual play events with embedded song snapshot |

---

## ⚙️ Prerequisites

- **Node.js** v18 or later
- **MongoDB** running locally **or** a MongoDB Atlas connection string
- The database must be named `streamiq` and already populated (see import instructions)

---

## 🚀 Setup & Run

### 1. Install dependencies

```bash
cd streamiq-app
npm install
```

### 2. Make sure MongoDB is running and data is loaded

If you haven't already imported the data, follow `IMPORT_INSTRUCTIONS.md` in the root of the project repo:

```bash
mongoimport --db streamiq --collection users        --file data/users.json
mongoimport --db streamiq --collection artists      --file data/artists.json
mongoimport --db streamiq --collection listenHistory --file data/listenHistory.json
```

### 3. Start the server

```bash
# Standard
npm start

# Auto-reload during development
npm run dev
```

### 4. Open the app

```
http://localhost:3000
```

---

## 🌐 REST API Reference

### Users — `/api/users`

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/users` | Get all users (passwordHash excluded) |
| `GET` | `/api/users/:id` | Get one user |
| `POST` | `/api/users` | Create a user |
| `PUT` | `/api/users/:id` | Update username / email / tier |
| `PATCH` | `/api/users/:id/toggle-tier` | Toggle Free ↔ Premium |
| `DELETE` | `/api/users/:id` | Delete a user |

**POST / PUT body:**
```json
{
  "username": "melodyfan99",
  "email": "melodyfan99@email.com",
  "subscriptionTier": "Premium"
}
```

---

### Artists — `/api/artists`

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/artists` | Get all artists (optional `?genre=Electronic`) |
| `GET` | `/api/artists/:id` | Get one artist with full embedded albums/songs |
| `POST` | `/api/artists` | Create an artist |
| `PUT` | `/api/artists/:id` | Update name / country / genre / bio |
| `PATCH` | `/api/artists/:id/toggle-explicit` | Toggle `isExplicit` on every song in a given album |
| `DELETE` | `/api/artists/:id` | Delete an artist |

**PATCH toggle-explicit body:**
```json
{ "albumTitle": "Concrete Jungle" }
```
This satisfies the **Query 4 requirement** (flipping a boolean attribute) directly from the UI.

---

### Listen History — `/api/history`

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/history` | Get recent events (optional `?username=melodyfan99&limit=50`) |
| `GET` | `/api/history/count/:username` | Total plays + monthly breakdown for a user |
| `POST` | `/api/history` | Log a new play event |
| `DELETE` | `/api/history/:id` | Delete an event |

---

## 🎨 Frontend Features

**Users tab**
- View all users in a table with subscription tier badges
- Search/filter by username or email
- Create new users via modal form
- Edit username, email, and subscription tier
- Toggle subscription tier between Free ↔ Premium with one click
- Delete users

**Artists tab**
- View all artists with genre badges
- Search/filter by name, genre, or country
- Click **View** to expand an artist's full album and song catalog inline
- See track-level details: title, duration, explicit flag
- Toggle `isExplicit` on all songs in any album (boolean flip)
- Create and edit artists
- Delete artists

**Listen History tab**
- Stats cards showing per-user total play counts
- Browse recent play events, filterable by username
- Log new play events via modal form
- Delete individual events

---

## 🔧 Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Server port |
| `MONGO_URI` | `mongodb://localhost:27017` | MongoDB connection string |

Using MongoDB Atlas:
```bash
MONGO_URI="mongodb+srv://user:pass@cluster.mongodb.net/" npm start
```

---

## 📦 Dependencies

| Package | Purpose |
|---|---|
| `express` | Web framework |
| `mongodb` | Official MongoDB Node.js driver |
| `nodemon` | Dev auto-reload (devDependency) |

---

## 👤 Author

CS3200 — Introduction to Database Design  
Project 2: Document Database with MongoDB  
Database: **StreamIQ** — Music Streaming Platform
