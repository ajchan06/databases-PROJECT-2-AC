# StreamIQ — Music Streaming Document Database
### CS3200 Project 2: Design & Implement a Document Database

StreamIQ is a music streaming platform database originally built as a normalized relational database in SQLite3 (Project 1) and adapted here to a document-based MongoDB database (Project 2). The platform models core entities including users, artists, albums, songs, playlists, listen history, and streaming analytics.

For the MongoDB adaptation, the 10 normalized relational tables were restructured into **3 root collections** — `users`, `artists`, and `listenHistory` — using embedded documents and denormalization following MongoDB best practices. Playlists, followed artists, and listening snapshots are embedded within user documents. Albums and songs (with credited artist roles) are embedded within artist documents. Listen history remains a separate collection to handle unbounded growth, with denormalized song snapshots for fast reads.

**AI Usage:** AI tools (Claude by Anthropic) were used to assist with generating mock data, structuring JSON collection examples, drafting MongoDB queries, and reformatting the README sections.

---

## Repository Structure

```
databases-Project-2-AC/
├── collections/            # JSON examples defining each collection's structure
├── data/                   # Mock data files for import (Extended JSON format)
│   ├── users.json
│   ├── artists (1).json
│   └── listenHistory (1).json
├── docs/                   # UML Class Diagram and MongoDB ERD
├── queries/                # Five MongoDB queries (js files)
│   ├── queries.js
│   ├── query1_aggregation.js
│   ├── query2_complex_search.js
│   ├── query3_count_documents.js
│   ├── query4_update_document.js
│   └── query5_user_dashboard.js
├── streamiq-app/           # Node + Express CRUD application
│   ├── app.js
│   ├── package.json
│   ├── routes/
│   │   ├── users.js
│   │   ├── artists.js
│   │   └── history.js
│   └── public/
│       └── index.html
├── .gitignore
├── LICENSE
└── README.md
```

---

## Part 1 — Problem Requirements & UML (5 pts)

See `docs/` for the full requirements document and UML Class Diagram.

The platform manages the following core entities: Users, Artists, Albums, Songs, Playlists, ListenHistory, and ListeningSnapshots. Key rules include:
- Artists release one or more albums; albums contain one or more songs
- Songs may credit multiple artists with different roles (Primary, Featured, Producer)
- Users create playlists, follow artists, and generate listen events
- Every play is logged with a timestamp and duration for royalty and analytics purposes

**UML Class Diagram:**
🔗 https://lucid.app/lucidchart/c9bd40e4-83f2-448a-9769-c81f1e9cafdc/edit?invitationId=inv_4d8b1b3d-a69b-47f9-8abd-9f3148d1c77b&page=0_0#

---

## Part 2 — Logical Data Model (15 pts)

The relational model was adapted into a hierarchical document model with 3 root collections, following MongoDB's embedded data pattern.

**MongoDB ERD:**
🔗 https://lucid.app/lucidchart/bcc77c0b-a90d-45d7-b746-c14ecd1f02a4/edit?invitationId=inv_ef9d8c28-5e08-403c-91f9-f3bee7038371&page=0_0#

### SQL → NoSQL Mapping

| Relational Table | MongoDB Destination | Relationship |
|---|---|---|
| User | `users` root collection | Root document |
| Playlist | Embedded in `users.playlists[]` | Composition (1-to-many) |
| PlaylistSong | Embedded in `users.playlists[].songs[]` | Composition |
| UserArtist | Embedded in `users.followedArtists[]` | Aggregation |
| ListeningSnapshot | Embedded in `users.listeningSnapshots[]` | Composition |
| Artist | `artists` root collection | Root document |
| Album | Embedded in `artists.albums[]` | Composition (1-to-many) |
| Song | Embedded in `artists.albums[].songs[]` | Composition |
| SongArtist | Embedded in `artists.albums[].songs[].artists[]` | Aggregation |
| ListenHistory | `listenHistory` root collection | Root (unbounded growth) |

### Design Rationale

- **`users`** — Playlists and snapshots are bounded by the user and embedded for fast profile reads
- **`artists`** — All catalog content (albums, songs, credits) lives inside the artist document
- **`listenHistory`** — Kept separate because play events grow unboundedly; embedding them inside users would exceed MongoDB's 16MB document limit. A denormalized song snapshot is embedded in each event to avoid cross-collection lookups

---

## Part 3 — Collection Definitions in JSON (10 pts)

See the `collections/` folder for fully annotated JSON examples of all three collections.

### `users` collection
Embeds: playlists (with songs), followedArtists, listeningSnapshots
```json
{
  "_id": { "$oid": "665a1b2c3d4e5f6a7b8c0001" },
  "username": "melodyfan99",
  "email": "melodyfan99@email.com",
  "subscriptionTier": "Premium",
  "dateJoined": "2023-06-15",
  "playlists": [
    {
      "playlistID": 101,
      "name": "Chill Vibes",
      "visibility": "Public",
      "songs": [
        { "songID": 1001, "title": "Midnight Rain", "artistName": "Aurora Wave", "position": 1 }
      ]
    }
  ],
  "followedArtists": [
    { "artistID": 201, "name": "Aurora Wave", "followedDate": "2023-06-20" }
  ],
  "listeningSnapshots": [
    { "snapshotMonth": "2024-01-01", "totalMinutes": 1840, "mostActiveDay": "Saturday" }
  ]
}
```

### `artists` collection
Embeds: albums → songs → credited artists
```json
{
  "_id": { "$oid": "665b2c3d4e5f6a7b8c9d0201" },
  "name": "Aurora Wave",
  "country": "Sweden",
  "primaryGenre": "Indie Pop",
  "albums": [
    {
      "albumID": 301,
      "title": "Dreamscape",
      "releaseDate": "2022-03-18",
      "albumType": "LP",
      "songs": [
        {
          "songID": 1001,
          "title": "Midnight Rain",
          "duration": 234,
          "trackNumber": 1,
          "isExplicit": false,
          "artists": [
            { "artistID": 201, "name": "Aurora Wave", "role": "Primary" }
          ]
        }
      ]
    }
  ]
}
```

### `listenHistory` collection
Embeds: denormalized song snapshot for fast reads
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

## Part 4 — Mock Data & Database Setup (15 pts)

### Data Files

| File | Collection | Documents |
|---|---|---|
| `data/users.json` | `users` | 10 |
| `data/artists (1).json` | `artists` | 5 |
| `data/listenHistory (1).json` | `listenHistory` | 79 |

### Import via mongoimport (CLI)

```bash
# Make sure MongoDB is running
mongosh

# Import each collection
mongoimport --db streamiq --collection users         --file "data/users.json"
mongoimport --db streamiq --collection artists       --file "data/artists (1).json"
mongoimport --db streamiq --collection listenHistory --file "data/listenHistory (1).json"

# Verify counts
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

### Import via MongoDB Compass (GUI)

1. Open Compass → connect to `mongodb://localhost:27017`
2. Create database: `streamiq`
3. For each collection: **Add Data → Import JSON or CSV file** → select the file → Import
4. Verify document counts match the table above

### Reset the Database

```bash
mongosh streamiq --eval "db.dropDatabase()"
# Then re-run the import commands above
```

---

## Part 5 — Queries (30 pts)

All queries are in the `queries/` folder. See each file for full code and comments.

```bash
# Run all queries at once
mongosh streamiq --file queries/queries.js

# Or run individually
mongosh streamiq --file queries/query1_aggregation.js
```

| # | File | Requirement | Purpose |
|---|---|---|---|
| 1 | `query1_aggregation.js` | Aggregation framework | Top 5 most-played songs with total plays and avg duration |
| 2 | `query2_complex_search.js` | Complex search with `$or` | Find explicit or long songs in Electronic/Hip-Hop released after 2023 |
| 3 | `query3_count_documents.js` | Count documents for a user | Total listens + monthly breakdown for "melodyfan99" |
| 4 | `query4_update_document.js` | Update / boolean toggle | Toggle `isExplicit` flag on all songs in an album |
| 5 | `query5_user_dashboard.js` | Showcase query | User dashboard: playlists, followed artists, total listening minutes |

---

## Part 6 — Node + Express Application (25 pts)

A full-stack CRUD web application is in the `streamiq-app/` folder.

### Setup & Run

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
| **Users** | Create, view, edit, delete · Toggle subscription tier (Free ↔ Premium) · Search by username |
| **Artists** | Create, view, edit, delete · Expand full album/song catalog · Toggle `isExplicit` per album |
| **Listen History** | Browse events by user · Log new plays · Per-user play count stats · Delete events |

---

## Video Demonstration

Link: https://youtu.be/cm3-aqsBc-4
