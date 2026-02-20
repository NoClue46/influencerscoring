import type { jobs, posts, reelsUrls, stories, comments } from "./schema.js";

export type Job = typeof jobs.$inferSelect;
export type NewJob = typeof jobs.$inferInsert;

export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;

export type Reels = typeof reelsUrls.$inferSelect;
export type NewReels = typeof reelsUrls.$inferInsert;

export type Story = typeof stories.$inferSelect;
export type NewStory = typeof stories.$inferInsert;

export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;
