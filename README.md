# Vinyl Bot

Vinyl Bot is a Discord-based vinyl collection manager built for record collectors who want to track what they own, what they want, and what they play without leaving chat.

The bot connects to Spotify for album lookup, Discogs for pressing checks, and Supabase for persistent collection data. It is designed for quick mobile-friendly use while browsing record stores or managing a collection from a shared Discord server.

## Features

- Search and browse a vinyl collection and wantlist from Discord
- Add records to the collection or wishlist
- Log album plays with listener tracking
- View stats, low-play albums, stale records, and unplayed items
- Get random picks from the collection, wantlist, or filtered subsets
- Use Spotify links for album lookup and Discogs for vinyl-pressing checks
- Store all of the data in Supabase for later querying and reporting

## Project structure

```text
RecordBot/
├── README.md
├── Available Commands.md
├── VinylBot/
│   ├── .env
│   ├── Dockerfile
│   ├── docker-compose.yml
│   ├── discordMapping.json
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── discord/
│   │   ├── discogs/
│   │   ├── services/
│   │   ├── spotify/
│   │   ├── utils/
│   │   └── index.ts
│   ├── tests/
│   └── dist/
└──
```

## Why this project exists

This bot is meant to solve a practical problem: keeping a vinyl collection organized in a shared Discord community without requiring a separate app or website for every action. Instead of a web dashboard, core actions happen directly in Discord, which makes it easy to:

- add an album quickly from a Spotify share
- log a play immediately after listening
- see what is missing from a collection or wishlist
- generate recommendations and stats from the collection history

## Tech stack

- TypeScript
- Node.js
- Discord.js
- Supabase
- Spotify API
- Discogs API
- Vitest
- Docker

## Requirements

- Node.js 20 or newer for local development
- A Discord bot token
- A Supabase project with URL and anon/service key
- Spotify API credentials
- Discogs consumer key and secret
- A valid `discordMapping.json` file for user lookup/DM access mapping

## Configuration

Create a `.env` file in the `VinylBot/` directory with the required variables:

```env
DISCORD_TOKEN=your_discord_bot_token
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_supabase_key
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
DISCOG_KEY=your_discogs_key
DISCOG_SECRET=your_discogs_secret
```

The bot also relies on `discordMapping.json` in the project root to map Discord users to collection owners and allow direct-message access checks.

## Local development

From the project root:

```bash
cd VinylBot
npm install
npm run dev
```

This starts the bot in watch mode using `tsx`.

## Production build

```bash
cd VinylBot
npm run build
npm run start
```

## Docker

The project includes a Docker setup for running the bot in a containerized environment.

```bash
cd VinylBot
docker compose up --build
```

The Docker configuration loads environment variables from `.env` and expects a mounted `service-account.json` if required by your deployment setup.

## Useful commands

The bot responds to Discord commands like:

- `!help` — display available commands
- `!add {spotify link}` — add an album to the database
- `!want {spotify link}` — add an album to the want list
- `!have` — show your collection
- `!wantlist` — show the want list
- `!play {spotify link} {user}` — log a play
- `!playlogs` — view play history
- `!stats` — see collection statistics
- `!random` — choose a random album
- `!stale` — list albums with the longest time since a play
- `!unplayed` — show unplayed titles
- `!exists {spotify link}` — check whether a pressing exists on Discogs

For a more complete command reference, see [Available Commands.md](./Available%20Commands.md).

## License

This project currently uses the ISC license as defined in the package configuration.

## Notes

This project is a focused community tool rather than a general-purpose public bot. It is designed around a shared household or group vinyl collection workflow and assumes a known set of users, accounts, and Discord mappings.
