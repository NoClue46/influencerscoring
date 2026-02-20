import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { relations, sql } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

export const jobs = sqliteTable("jobs", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
  username: text("username").notNull(),
  followers: integer("followers").default(0).notNull(),
  postPrompt: text("post_prompt").notNull(),
  bloggerPrompt: text("blogger_prompt"),
  allVideos: integer("all_videos", { mode: "boolean" }).notNull(),

  status: text("status").default("pending").notNull(),
  reason: text("reason"),
  redflag: text("redflag"),
  isPrivate: integer("is_private", { mode: "boolean" }).default(false).notNull(),
  avatarUrl: text("avatar_url"),

  postNumber: integer("post_number").default(10).notNull(),
  attempts: integer("attempts").default(0).notNull(),

  analyzeRawText: text("analyse_raw_text"),
  nicknameAnalyseRawText: text("nickname_analyse_raw_text"),
  score: real("score"),
  avgIncomeLevel: real("avg_income_level"),
  avgAgeScore: real("avg_age_score"),
});

export const posts = sqliteTable("posts", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  postUrl: text("post_url").notNull(),
  filepath: text("file_path"),
  downloadUrl: text("downloadUrl").notNull(),
  isVideo: integer("is_video", { mode: "boolean" }).default(false).notNull(),
  reason: text("reason"),
  jobId: text("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
  analyzeRawText: text("analuze_raw_text"),
  hasBloggerFace: integer("has_blogger_face", { mode: "boolean" }).default(false).notNull(),
  commentCount: integer("comment_count").default(0),
  commentEr: real("comment_er").default(0),
});

export const reelsUrls = sqliteTable("reels_urls", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  reelsUrl: text("reels_url").notNull(),
  downloadUrl: text("video_url"),
  filepath: text("file_path"),
  reason: text("reason"),
  transcription: text("transcription"),
  jobId: text("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
  analyzeRawText: text("analuze_raw_text"),
  hasBloggerFace: integer("has_blogger_face", { mode: "boolean" }).default(false).notNull(),
  commentCount: integer("comment_count").default(0),
  commentEr: real("comment_er").default(0),
});

export const stories = sqliteTable("stories", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  storyId: text("story_id").notNull(),
  downloadUrl: text("download_url").notNull(),
  filepath: text("filepath"),
  reason: text("reason"),
  transcription: text("transcription"),
  isVideo: integer("is_video", { mode: "boolean" }).default(false).notNull(),
  jobId: text("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
  analyzeRawText: text("analuze_raw_text"),
  hasBloggerFace: integer("has_blogger_face", { mode: "boolean" }).default(false).notNull(),
});

export const comments = sqliteTable("comments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  postId: text("post_id").references(() => posts.id, { onDelete: "cascade" }),
  reelsId: text("reels_id").references(() => reelsUrls.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  analyseRawText: text("analyse_raw_text"),
});

// Relations

export const jobsRelations = relations(jobs, ({ many }) => ({
  reels: many(reelsUrls),
  posts: many(posts),
  stories: many(stories),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  job: one(jobs, { fields: [posts.jobId], references: [jobs.id] }),
  comments: many(comments),
}));

export const reelsUrlsRelations = relations(reelsUrls, ({ one, many }) => ({
  job: one(jobs, { fields: [reelsUrls.jobId], references: [jobs.id] }),
  comments: many(comments),
}));

export const storiesRelations = relations(stories, ({ one }) => ({
  job: one(jobs, { fields: [stories.jobId], references: [jobs.id] }),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  post: one(posts, { fields: [comments.postId], references: [posts.id] }),
  reels: one(reelsUrls, { fields: [comments.reelsId], references: [reelsUrls.id] }),
}));
