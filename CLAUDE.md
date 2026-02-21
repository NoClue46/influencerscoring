# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun run dev       # Dev server with watch mode (bun --watch src/app/bootstrap.ts)
bun run start     # Production start
bun run build     # TypeScript compile (tsc)
bun run typecheck # Type check only (tsc --noEmit)
bunx drizzle-kit push     # Push schema to DB
bunx drizzle-kit generate # Generate migrations
bunx drizzle-kit migrate  # Run migrations
```

## Architecture

Instagram influencer analysis pipeline with job-based processing. Accepts username → runs multi-stage automated pipeline → produces suitability score for advertising.

**Stack**: Bun runtime, Hono web server (port 4141), Drizzle ORM (SQLite via bun:sqlite, WAL mode), Vercel AI SDK + raw OpenAI SDK, ScrapeCreators API

**UI**: Server-side rendered HTML via Hono `html` tagged templates, PicoCSS + Alpine.js (no SPA)

**AI Models**:
- `gpt-5-mini` (Vercel AI SDK) — per-item analysis, comment analysis, gender check, full blogger analysis
- `gpt-5` (Vercel AI SDK + webSearch tool) — nickname reputation + age research
- `gpt-5-mini` (raw OpenAI SDK) — vision analysis in redflag stage, template comment check
- `whisper-1` — audio transcription

### Job Pipeline

All cron jobs run every 5s. Orchestrated via `withJobTransition()` — finds job by status, transitions, runs handler, retries up to 4 attempts.

1. **redflag-check** (`pending` → `redflag_checking_*`) — Fetches profile, checks: private account, followers < 7k, age < 35, reputation < 60, income < 60. Fetches 5 posts + analyzes income via vision. Checks template/bot comments.
2. **fetch** (`redflag_checking_finished` → `fetching_*`) — Fetches remaining reels/posts/stories URLs + comments (105/item) via ScrapeCreators. Deduplicates against stage 1 posts. Posts = GraphImage only (no videos/carousels). Stories from highlights (not live).
3. **download** (`fetching_finished` → `downloading_*`) — Downloads media to `data/{username}/{jobId}/{itemId}/`. Avatar → `avatar.jpg`. 200MB max, chunks of 2 parallel, 3 retries.
4. **framing** (`downloading_finished` → `framing_*`) — `ffmpeg -vf fps=1` on reels + video stories → `frames/frame_%04d.jpg`
5. **speech-to-text** (`framing_finished` → `speech_to_text_*`) — ffmpeg audio extraction → Whisper transcription for reels + video stories
6. **analyze** (`speech_to_text_finished` → `analyzing_*` → `completed`) — Per-item: avatar + content → structured analysis (face detection, personality, content). Comments analyzed in batches of 5. Full blogger analysis: aggregates all items → 16 metrics. Female avatar → `expert_status=100`. Score = weighted sum of 6 personality metrics.
7. **cleanup** (every 10min) — Deletes `data/` directories for completed/failed jobs

**Startup recovery**: `recoverStuckJobs()` resets `*_started` → previous `*_finished` status.

**Scoring**: `(structured_thinking×10 + knowledge_depth×10 + intelligence×10 + personal_values×30 + enthusiasm×10 + charisma×30) / 100`. Score >= 60 = recommended.

### Key Files

```
src/
  app/
    bootstrap.ts                          # Entry point, starts server + cron jobs
    server.ts                             # Hono app with logger middleware
    http/routes/jobs-routes.ts            # POST / (create), GET / (list), GET /jobs/:id (detail)
    http/views/                           # SSR HTML views (layout, jobs-list, job-details)
  infra/
    db/schema.ts                          # Drizzle schema: jobs, posts, reels_urls, stories, comments + relations
    db/index.ts                           # Drizzle client (bun:sqlite)
    db/types.ts                           # Inferred TS types (Job, Post, Reels, Story, Comment)
    storage/files/paths.ts                # getJobBasePath, getAvatarPath, getItemPath
    storage/files/download-file.ts        # downloadFile() with maxSize HEAD check
  modules/
    ai/application/                       # analyze-comment, analyze-nickname-reputation, check-gender-from-avatar
    ai/infra/openai-gateway.ts            # Raw OpenAI SDK: askOpenai (vision), askOpenaiText, transcribeAudio
    ai/prompts/                           # All prompt templates + Zod schemas
    instagram/infra/scrape-creators/      # ScrapeCreators API: fetch-profile, fetch-posts, fetch-reels, fetch-stories, fetch-comments
    media/infra/ffmpeg/                   # extract-frames, extract-audio
    pipeline/application/stages/          # All CronJob stage files
    pipeline/application/analyze/         # analyze-post, analyze-reel, analyze-story, full-blogger-analysis
    pipeline/application/orchestrator/    # withJobTransition, recoverStuckJobs
  shared/
    config/limits.ts                      # MAX_ATTEMPTS=4, MAX_FILE_SIZE=200MB
    types/job-status.ts                   # JOB_STATUS const + JobStatus type
    utils/async.ts                        # sleep, chunk, withRetry
```

### DB Schema Notes

- Column typo: `analuze_raw_text` in posts/reels/stories (vs `analyse_raw_text` in jobs)
- `avg_age_score` column exists but never written
- `allVideos` flag controls full blogger analysis; hardcoded `true` on creation
- Foreign keys with cascade delete on all relations

## Environment Variables

```
DB_PATH=file:./dev.db
DATA_PATH=./data              # Base directory for downloaded media
SCRAPE_CREATORS=<api-key>
OPENAI_API_KEY=<api-key>
```
