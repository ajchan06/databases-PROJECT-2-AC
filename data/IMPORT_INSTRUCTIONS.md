# Database Import Instructions

## Prerequisites

- **MongoDB** (v6.0 or later) installed and running
- **mongoimport** CLI tool (included with MongoDB Database Tools)
- Alternatively: **MongoDB Compass** (GUI)

## Data Files

| File | Collection | Records | Description |
|------|-----------|---------|-------------|
| `users.json` | users | 10 | User accounts with embedded playlists, followed artists, snapshots |
| `artists.json` | artists | 5 | Artists with embedded albums and songs |
| `listenHistory.json` | listenHistory | 79 | Individual play events with embedded song info |

All files use **Extended JSON** format (one document per line) compatible with `mongoimport`.

## Option 1: Import using mongoimport (CLI)

### Step 1: Make sure MongoDB is running

```bash
mongosh
# If this connects successfully, MongoDB is running
```

### Step 2: Create the database and import each collection

```bash
# Import users collection
mongoimport --db streamiq --collection users --file data/users.json

# Import artists collection
mongoimport --db streamiq --collection artists --file data/artists.json

# Import listen history collection
mongoimport --db streamiq --collection listenHistory --file data/listenHistory.json
```

### Step 3: Verify the import

```bash
mongosh streamiq --eval "
  print('Users: ' + db.users.countDocuments());
  print('Artists: ' + db.artists.countDocuments());
  print('Listen History: ' + db.listenHistory.countDocuments());
"
```

Expected output:
```
Users: 10
Artists: 5
Listen History: 79
```

## Option 2: Import using MongoDB Compass (GUI)

1. Open **MongoDB Compass** and connect to `localhost:27017`
2. Click **Create Database** — Database Name: `streamiq`
3. For each collection:
   - Click **Create Collection** — name it (`users`, `artists`, or `listenHistory`)
   - Click **Add Data** — **Import JSON or CSV file**
   - Select the corresponding `.json` file from the `data/` folder
   - Click **Import**
4. Verify document counts match the table above

## Database Schema Overview

### Collections

- **users** — Root collection. Embeds: playlists (with songs), followedArtists, listeningSnapshots
- **artists** — Root collection. Embeds: albums (with songs, each song has credited artists)
- **listenHistory** — Root collection. Embeds: a denormalized song snapshot. References users and artists via IDs.

### Cross-collection References

- `listenHistory.userID` → `users._id`
- `listenHistory.song.songID` → `artists.albums.songs.songID`
- `users.followedArtists.artistID` → `artists._id`
- `users.playlists.songs.songID` → `artists.albums.songs.songID`

## Dropping / Resetting the Database

To start fresh:

```bash
mongosh streamiq --eval "db.dropDatabase()"
```

Then re-run the import commands from Step 2 above.
