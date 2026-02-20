# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun run dev       # Dev server with watch mode
bun run start     # Production start
bun run build     # TypeScript compile
bun run typecheck # Type check only
bunx drizzle-kit push     # Push schema to DB
bunx drizzle-kit pull     # Introspect DB into schema
bunx drizzle-kit generate # Generate migrations
bunx drizzle-kit migrate  # Run migrations
```

## Architecture

Instagram influencer analysis pipeline with job-based processing.

**Stack**: Hono web server, Drizzle ORM (SQLite via bun:sqlite), OpenAI API (GPT-4o-mini, Whisper), ScrapeCreators API

**Job Pipeline** (cron jobs every 5s):
1. `redflag-check` - Pre-screening: followers, reputation, income level
2. `fetch` - Fetches reels/posts/stories URLs + comments via ScrapeCreators API
3. `download` - Downloads media files to `data/{jobId}/`
4. `framing` - Extracts frames from videos using ffmpeg
5. `speech-to-text` - Transcribes video audio via Whisper
6. `analyze` - Analyzes content with GPT-4o vision + aggregates results

**Status Flow**: `pending` → `redflag_checking_started/finished` → `fetching_started/finished` → `downloading_started/finished` → `framing_started/finished` → `speech_to_text_started/finished` → `analyzing_started/finished` → `completed/failed`

**Key Files**:
- `src/app/bootstrap.ts` - Entry point, server setup
- `src/app/http/routes/jobs-routes.ts` - HTTP endpoints
- `src/infra/db/schema.ts` - Drizzle schema + relations
- `src/infra/db/index.ts` - Drizzle client (bun:sqlite)
- `src/infra/db/types.ts` - Exported types (Job, Post, Reels, Story, Comment)
- `src/modules/pipeline/application/stages/*.ts` - Pipeline stages as CronJob instances
- `src/modules/ai/` - OpenAI helpers, prompts
- `src/modules/instagram/` - ScrapeCreators API wrapper

## Environment Variables

```
DB_PATH=file:./dev.db
SCRAPE_CREATORS=<api-key>
OPENAI_API_KEY=<api-key>
```
