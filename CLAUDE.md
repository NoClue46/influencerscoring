# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Dev server with watch mode (tsx)
npm run start     # Production start
npm run build     # TypeScript compile
npm run typecheck # Type check only
npx prisma migrate dev   # Run migrations
npx prisma generate      # Generate Prisma client
```

## Architecture

Instagram influencer analysis pipeline with job-based processing.

**Stack**: Hono web server, Prisma ORM (SQLite), OpenAI API (GPT-4o-mini, Whisper), ScrapeCreators API

**Job Pipeline** (cron jobs every 5s):
1. `fetch` - Fetches reels/posts/stories URLs + comments via ScrapeCreators API
2. `download` - Downloads media files to `data/{jobId}/`
3. `framing` - Extracts frames from videos using ffmpeg
4. `speech-to-text` - Transcribes video audio via Whisper
5. `analyze` - Analyzes content with GPT-4o vision + aggregates results

**Status Flow**: `pending` → `fetching_started/finished` → `downloading_started/finished` → `framing_started/finished` → `speech_to_text_started/finished` → `analyzing_started/finished` → `completed/failed`

**Key Files**:
- `src/index.ts` - Hono server, routes, HTML templates
- `src/jobs/*.ts` - Pipeline stages as CronJob instances
- `src/scrape-creators.ts` - Instagram API wrapper
- `src/ask-openai.ts` - OpenAI helpers (vision, text, whisper, web search)
- `src/constants.ts` - Prompts and config

## Environment Variables

```
DATABASE_URL=file:./dev.db
SCRAPE_CREATORS=<api-key>
OPENAI_API_KEY=<api-key>
```
