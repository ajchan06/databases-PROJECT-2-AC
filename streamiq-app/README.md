# StreamIQ — Music Streaming Document Database
### CS3200 Project 2: Design & Implement a Document Database

---

## Table of Contents
1. [Problem Requirements & UML](#1-problem-requirements--uml)
2. [Logical Data Model](#2-logical-data-model)
3. [Collections — JSON Definitions](#3-collections--json-definitions)
4. [Database Setup & Mock Data](#4-database-setup--mock-data)
5. [Queries](#5-queries)
6. [Node + Express Application](#6-node--express-application)

---

## 1. Problem Requirements & UML

StreamIQ is a music streaming platform that centralizes all music catalog and user activity data into a single database. The platform models artists, albums, songs, playlists, and listen history together — creating one source of truth for catalog management, royalty attribution, and personalized recommendations.

### Core Database Rules
- Each artist has a name, country of origin, and primary genre
- An artist can release one or more albums; each album belongs to exactly one primary artist
- Each album has a title, release date, and type (Single, EP, or LP), and contains one or more songs
- Each song has a title, duration, track number, and explicit content flag
- A song may credit multiple artists (featured artists, producers), each with a role
- Each user has a unique username, email, and subscription tier (Free, Premium, or Family)
- A user can create zero or more playlists; each playlist belongs to exactly one user
- A playlist has a name, visibility setting (Public or Private), and an ordered list of songs
- A song can appear in multiple playlists; a playlist can contain multiple songs
- Every time a user plays a song, a listen record is created with a timestamp and play duration
- A user can follow zero or more artists

### UML Class Diagram
📄 See `uml-diagram.pdf` in this repository

🔗 LucidChart URL: https://lucid.app/lucidchart/c9bd40e4-83f2-448a-9769-c81f1e9cafdc/edit?invitationId=inv_4d8b1b3d-a69b-47f9-8abd-9f3148d1c77b&page=0_0#

---

## 2. Logical Data Model

The relational model from Project 1 (10 normalized tables) was adapted into a hierarchical document model with **3 root collections**. The key design decisions follow MongoDB's embedded data pattern.

### ERD — MongoDB Hierarchical Model
📄 See `erd-mongo.pdf` in this repository

🔗 LucidChart URL: https://lucid.app/lucidchart/bcc77c0b-a90d-45d7-b746-c14ecd1f02a4/edit?invitationId=inv_ef9d8c28-5e08-403c-91f9-f3bee7038371&page=0_0#

### SQL → NoSQL Mapping

| Relational Table | MongoDB Destination | Relationship Type |
|---|---|---|
| User | `users` root collection | Root document |
| Playlist | Embedded in `users.playlists[]` | Composition (1-to-many) |
| PlaylistSong | Embedded in `users.playlists[].songs[]` | Composition |
| UserArtist (follows) | Embedded in `users.followedArtists[]` | Aggregation |
| ListeningSnapshot | Embedded in `users.listeningSnapshots[]` | Composition |
| Artist | `artists` root collection | Root document |
| Album | Embedded in `artists.albums[]` | Composition (1-to-many) |
| Song | Embedded in `artists.albums[].songs[]` | Composition |
| SongArtist | Embedded in `artists.albums[].songs[].artists[]` | Aggregation |
| ListenHistory | `listenHistory` root collection | Root document (unbounded) |

### Why 3 Root Collections?

**`users`** is a root collection because users are the primary actors in the system. Playlists, followed artists, and monthly snapshots are all owned by and bounded by the user — they are embedded.

**`artists`** is a root collection because all music catalog content lives here. Albums and songs only exist within an artist context — they are composed and embedded.

**`listenHistory`** is kept as a separate root collection rather than embedded in users because play events grow unboundedly. Embedding millions of records inside a user document would exceed MongoDB's 16MB document limit. Each event stores a denormalized song snapshot (title, artist, album) to avoid expensive cross-collection lookups.

---

## 3. Collections — JSON Definitions

### Collection 1: `users`
Each document represents a registered user. Embeds playlists (with songs), followed artists, and monthly listening snapshots.

```json
{
  "_id": { "$oid": "665a1b2c3d4e5f6a7b8c0001" },
  "username": "melodyfan99",
  "email": "melodyfan99@email.com",
  "passwordHash": "$2b$10$gTHKbfoLISRABr1VjArnVg",
  "subscriptionTier": "Premium",
  "dateJoined": "2023-06-15",

  "playlists": [
    {
      "playlistID": 101,
      "name": "Chill Vibes",
      "description": "Relaxing tracks for studying",
      "visibility": "Public",
      "createdDate": "2023-07-01",
      "songs": [
        {
          "songID": 1001,
          "title": "Midnight Rain",
          "artistName": "Aurora Wave",
          "position": 1,
          "addedDate": "2023-07-01"
        }
      ]
    }
  ],

  "followedArtists": [
    {
      "artistID": 201,
      "name": "Aurora Wave",
      "followedDate": "2023-06-20"
    }
  ],

  "listeningSnapshots": [
    {
      "snapshotMonth": "2024-01-01",
      "totalMinutes": 1840,
      "mostActiveDay": "Saturday"
    }
  ]
}
```

---

### Collection 2: `artists`
Each document represents an artist. Embeds albums, which embed songs, which embed credited artist roles.

```json
{
  "_id": { "$oid": "665b2c3d4e5f6a7b8c9d0201" },
  "name": "Aurora Wave",
  "country": "Sweden",
  "primaryGenre": "Indie Pop",
  "bio": "Swedish indie pop artist known for dreamy synth-driven soundscapes.",

  "albums": [
    {
      "albumID": 301,
      "title": "Dreamscape",
      "releaseDate": "2022-03-18",
      "albumType": "LP",
      "coverImageURL": "https://images.streamiq.com/albums/dreamscape.jpg",
      "songs": [
        {
          "songID": 1001,
          "title": "Midnight Rain",
          "duration": 234,
          "trackNumber": 1,
          "isExplicit": false,
          "artists": [
            { "artistID": 201, "name": "Aurora Wave", "role": "Primary" },
            { "artistID": 203, "name": "DJ Prism",    "role": "Featured" }
          ]
        }
      ]
    }
  ]
}
```

---

### Collection 3: `listenHistory`
Each document represents a single play event. Kept separate from users to handle unbounded growth. Embeds a lightweight denormalized song snapshot so reads don't require a join to the artists collection.

```json
{
  "_id": { "$oid": "665c3d4e5f6a7b8c9d030001" },
  "timestamp": "2024-02-14T18:32:15Z",
  "playDuration": 230,
  "userID": { "$oid": "665a1b2c3d4e5f6a7b8c0001" },
  "username": "melodyfan99",
  "song": {
    "songID": 1001,
    "title": "Midnight Rain",
    "artistName": "Aurora Wave",
    "albumTitle": "Dreamscape"
  }
}
```

---

## 4. Database Setup & Mock Data

### Data Files

| File | Collection | Documents |
|---|---|---|
| `data/users.json` | `users` | 10 |
| `data/artists (1).json` | `artists` | 5 |
| `data/listenHistory (1).json` | `listenHistory` | 79 |

### Option A — Import via mongoimport (CLI)

```bash
# Make sure MongoDB is running first
mongosh

# Import each collection
mongoimport --db streamiq --collection users         --file "data/users.json"
mongoimport --db streamiq --collection artists       --file "data/artists (1).json"
mongoimport --db streamiq --collection listenHistory --file "data/listenHistory (1).json"

# Verify
mongosh streamiq --eval "
  print('Users: '         + db.users.countDocuments());
  print('Artists: '       + db.artists.countDocuments());
  print('ListenHistory: ' + db.listenHistory.countDocuments());
"
```

Expected output:
```
Users: 10
Artists: 5
ListenHistory: 79
```

### Option B — Import via MongoDB Compass (GUI)

1. Open Compass and connect to `mongodb://localhost:27017`
2. Create database: `streamiq`
3. For each collection: **Add Data → Import JSON or CSV file** → select the file → Import
4. Verify document counts match the table above

### Reset the Database

```bash
mongosh streamiq --eval "db.dropDatabase()"
# Then re-run the import commands above
```

---

## 5. Queries

All queries are in the `queries/` folder. Run all at once or individually in mongosh.

```bash
# Run all queries
mongosh streamiq --file queries/queries.js

# Run individually
mongosh streamiq --file queries/query1_aggregation.js
```

### Query 1 — Aggregation Framework
**Requirement:** At least one query must use the aggregation framework.

**Purpose:** Find the top 5 most-played songs across all users, showing total plays, total seconds listened, and average play duration.

```js
db.listenHistory.aggregate([
  { $group: {
      _id: "$song.songID",
      title: { $first: "$song.title" },
      artistName: { $first: "$song.artistName" },
      totalPlays: { $sum: 1 },
      totalSecondsPlayed: { $sum: "$playDuration" },
      avgPlayDuration: { $avg: "$playDuration" }
  }},
  { $sort: { totalPlays: -1 } },
  { $limit: 5 }
])
```
📄 Full query: `queries/query1_aggregation.js`

---

### Query 2 — Complex Search with Logical Connectors
**Requirement:** One must contain a complex search criterion with logical connectors like `$or`.

**Purpose:** Find songs that are either explicit OR longer than 250 seconds, from albums released after 2023, in the Electronic or Hip-Hop genre.

```js
db.artists.aggregate([
  { $match: { primaryGenre: { $in: ["Electronic", "Hip-Hop"] } } },
  { $unwind: "$albums" },
  { $unwind: "$albums.songs" },
  { $match: {
      "albums.releaseDate": { $gte: "2023-01-01" },
      $or: [
        { "albums.songs.isExplicit": true },
        { "albums.songs.duration": { $gt: 250 } }
      ]
  }}
])
```
📄 Full query: `queries/query2_complex_search.js`

---

### Query 3 — Count Documents for a Specific User
**Requirement:** One should be counting documents for a specific user.

**Purpose:** Count how many songs user "melodyfan99" has listened to, with a monthly breakdown.

```js
db.listenHistory.countDocuments({ username: "melodyfan99" })
```
📄 Full query: `queries/query3_count_documents.js`

---

### Query 4 — Update Document (Boolean Toggle)
**Requirement:** One must be updating a document based on a query parameter (flipping a boolean attribute).

**Purpose:** Toggle the `isExplicit` flag for all songs in Max Sterling's "Concrete Jungle" album — simulating an admin enabling/disabling the explicit content flag.

```js
db.artists.updateOne(
  { name: "Max Sterling", "albums.title": "Concrete Jungle" },
  [{ $set: { "albums": { $map: {
    input: "$albums", as: "album",
    in: { $cond: {
      if: { $eq: ["$$album.title", "Concrete Jungle"] },
      then: { $mergeObjects: ["$$album", { songs: { $map: {
        input: "$$album.songs", as: "song",
        in: { $mergeObjects: ["$$song", { isExplicit: { $not: "$$song.isExplicit" } }] }
      }}}]},
      else: "$$album"
    }}
  }}}}]
)
```
📄 Full query: `queries/query4_update_document.js`

---

### Query 5 — User Dashboard Summary
**Requirement:** Additional query to showcase the database.

**Purpose:** For each user, show subscription tier, number of playlists, number of followed artists, and total listening time — sorted by most active listener.

```js
db.users.aggregate([
  { $project: {
      username: 1,
      subscriptionTier: 1,
      numPlaylists: { $size: "$playlists" },
      numFollowedArtists: { $size: "$followedArtists" },
      totalListeningMinutes: { $sum: "$listeningSnapshots.totalMinutes" }
  }},
  { $sort: { totalListeningMinutes: -1 } }
])
```
📄 Full query: `queries/query5_user_dashboard.js`

---

## 6. Node + Express Application

A full-stack CRUD web application is included in `streamiq-app/`. It supports create, display, modify, and delete operations on all three collections through a browser-based interface.

### Run the App

```bash
# Make sure MongoDB is running and data is imported first
cd streamiq-app
npm install
npm start
```

Open **http://localhost:3000** in your browser.

### Features

| Tab | Operations |
|---|---|
| **Users** | Create, view, edit, delete users · Toggle subscription tier (Free ↔ Premium) · Search by username |
| **Artists** | Create, view, edit, delete artists · Expand full album/song catalog · Toggle `isExplicit` per album |
| **Listen History** | Browse play events by user · Log new plays · Per-user play count stats · Delete events |

### API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/users` | Get all users |
| POST | `/api/users` | Create a user |
| PUT | `/api/users/:id` | Update a user |
| PATCH | `/api/users/:id/toggle-tier` | Toggle Free ↔ Premium |
| DELETE | `/api/users/:id` | Delete a user |
| GET | `/api/artists` | Get all artists |
| POST | `/api/artists` | Create an artist |
| PUT | `/api/artists/:id` | Update an artist |
| PATCH | `/api/artists/:id/toggle-explicit` | Toggle isExplicit on album songs |
| DELETE | `/api/artists/:id` | Delete an artist |
| GET | `/api/history` | Get listen events |
| GET | `/api/history/count/:username` | Count plays for a user |
| POST | `/api/history` | Log a new play event |
| DELETE | `/api/history/:id` | Delete a listen event |

---

## Repository Structure

```
├── data/
│   ├── users.json
│   ├── artists (1).json
│   └── listenHistory (1).json
├── queries/
│   ├── queries.js
│   ├── query1_aggregation.js
│   ├── query2_complex_search.js
│   ├── query3_count_documents.js
│   ├── query4_update_document.js
│   └── query5_user_dashboard.js
├── streamiq-app/
│   ├── app.js
│   ├── package.json
│   ├── routes/
│   │   ├── users.js
│   │   ├── artists.js
│   │   └── history.js
│   └── public/
│       └── index.html
├── DB_pj1_requireddoc.pdf
├── uml-diagram.pdf
├── erd-mongo.pdf
├── IMPORT_INSTRUCTIONS.md
└── README.md
```

---

## Video Demonstration

[https://youtu.be/cm3-aqsBc-4?si=52y0drGywk6-V2lh]

---

## AI Usage

AI tools (Claude by Anthropic) were used to assist with generating mock data, structuring JSON collection examples, drafting MongoDB queries, and reformatting README text file for github.
