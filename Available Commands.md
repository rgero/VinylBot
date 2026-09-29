## Available Commands
These are the available commands for Vinyl Bot.

Tags are comma-separated with no spaces (e.g. `--tags emo,punk`) and match albums with **any** of the tags.

### Help
- `!help` - Shows the command menu in Discord

### Want
 - `!want {spotify link}` - Adds the album to the want list

### Random
- `!random` - Chooses a random vinyl
- `!random --mine` - Chooses a random vinyl you own. Supports `--tags` and a search term.
- `!random {person}` - Chooses a random vinyl liked by that person
- `!random {term}` - Chooses a random vinyl matching that term
- `!random --tags {tags}` - Chooses a random vinyl matching any of the tags. Combines with a person or term.
- `!random --store` - Chooses a random store
- `!random --unplayed` - Chooses a random vinyl from your unplayed list
  - `!random {person} --unplayed` - Uses that person's unplayed list
  - Supports `--tags` and a search term
- `!random --low` - Chooses a random low-play vinyl. Includes unplayed albums but uses the lowest positive play count to define the pool.
  - `--limit {n}` - Pool is albums with at most `n` plays
  - `--mine` - Only considers albums you own and uses your own play counts (can't be combined with a mention)
  - Supports `--tags`, a person, or a search term

Only one of `--low`, `--store`, `--unplayed` can be used at a time.

### Play
Used to record when we play the vinyl
- `!play {spotify link}` - Adds a play for that album
- `!play {artist OR album}` -  Adds a play for that album. If there is more than one result, it will give you the   drop down
- Mention users to log multiple listeners

### Playlogs
- `!playlogs` - Gives you your playlogs
- `!playlogs {person}` - Gives you that person's playlogs
- `!playlogs --all` - Gives you everyone's playlogs
- `!playlogs --count` - Gives you your total number of plays
- `!playlog {id}` - Gives you the details of that playlog entry
- `!playlog --number {n}` - Looks up the playlog by its position in the list instead of its ID

### Want list
- `!wantlist` - Gives you the whole want list
- `!wantlist {person}` - Gives you the want list of that person
- `!wantlist {search term}` - Gives you the want list items that match that term 
- `--sort {field}{+|-}` - Sorts the list. Fields: `artist`, `album`, `length`, `plays` (e.g. `--sort plays-`). Default is `artist+`.

### Have List
It's the same as Want List just with `!have`
- `!have --tags {tags}` - Have list items matching any of the tags

### Tag
- `!tag {tags}` - Lists albums matching any of the tags
- Supports `--sort`

### Exists
Checks Discogs for a vinyl pressing
- `!exists --artist {name} --album {name}`
- `!exists {spotify link}` - Uses the artist/album from Spotify

### Info
- `!info {album name}` - Gives you some info about the album

### Add
- `!add {spotify link}` - Adds the album to the database. It won't be complete so you'll have to finish it on the website.

### Stats
- `!stats {user|artist}` - Top albums by play count (same as `--plays`)
- `!stats --plays {user|artist}` - Returns the top albums by play count
  - If there is no user or artist, it returns the top played albums of the household
  - If there is a user, it returns the top albums played for that user
  - If there is an artist, it returns the top albums played for that artist
- `!stats --albums` - Returns the top albums
- `!stats --artists {user}` - Returns the top artists
- `!stats --locations {user}` - Returns the locations sorted by album count
- `!stats --low {user|artist}` - Returns the lowest-played albums

Only one of `--plays`, `--albums`, `--artists`, `--locations`, `--low` can be used at a time.

Options:
- `--mine` - Use your own plays/purchases (`--plays`, `--low`, `--artists`, `--locations`). Can't be combined with a mention.
- `--dir asc|desc` - Reverse the order (`--plays` defaults to desc, `--low` to asc)
- `--count {n}` - `--plays`: albums with at least `n` plays; `--low`: at most `n`
- `--limit {n}` - `--low` only; albums with at most `n` plays

### Unplayed
- `!unplayed` - Shows your unplayed albums
- `!unplayed {person}` - Shows that person's unplayed albums
- `!unplayed --tags {tags}` - Unplayed albums matching any of the tags
- `!unplayed --mine` - Only unplayed albums you own
- `!unplayed --count` - Unplayed album counts per user (ignores `--tags`)
- Supports `--sort`