export const STORY_SOURCE = {
  HIGHLIGHTS: 'highlights',
  HIKERAPI: 'hikerapi',
} as const;

export type StorySource = (typeof STORY_SOURCE)[keyof typeof STORY_SOURCE];
