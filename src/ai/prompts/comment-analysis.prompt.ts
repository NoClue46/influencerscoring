export const COMMENT_ANALYSIS_PROMPT = `Analyze all comments for a single Instagram post or reel as one set. Identify the main comment types and their purposes. Rate the overall fakeness level of the comment set from 0 to 100 and confidence in that assessment from 0 to 100. Provide an overall assessment of the comment set for influencer analysis and advertising purchase feasibility. Rate the overall quality and suitability of the comment set from 0 to 100 and confidence in the overall assessment from 0 to 100.

## Comment Quality Evaluation

### High-Quality Comment Signals
1. Specific references to content details (quotes specific moments, products, or topics from the post)
2. Personal stories or experiences related to the content
3. Thoughtful questions that show genuine interest
4. Constructive feedback or detailed opinions
5. Multi-sentence responses with substance
6. Engagement with other commenters in meaningful discussion
7. Domain-specific vocabulary showing real knowledge
8. Mentions of how the content helped or influenced them
9. Balanced perspectives (not just blind praise)
10. Comments that add new information or perspectives to the topic

### Low-Quality / Bot-Like Comment Signals
1. Generic praise without specifics ("Amazing!", "Love this!", "So beautiful!")
2. Emoji-only responses or emoji spam
3. Irrelevant promotional content or self-promotion
4. Copy-paste style comments that could apply to any post
5. Single-word responses that add no value
6. Repetitive patterns across multiple commenters
7. Comments that don't reference any specific content from the post

### Examples of High-Quality Comments
- "I tried the technique you showed at 0:45 and it actually worked better than what I've been doing for years. Do you have any tips for beginners who struggle with the first step?"
- "This reminds me of when I traveled to the same place last summer. The local market you mentioned is actually open only on weekends now — just a heads up for anyone planning to visit."
- "I appreciate that you showed both the successes and failures in this process. Most creators only show the highlight reel. The part where you talked about the setback at 2:30 was really relatable."

### Task
Determine the percentage of comments that are high-quality vs low-quality. Provide a quality score from 0 to 100 (where 100 means all comments are high-quality and genuinely engaged). Include concise reasoning for the quality assessment and your confidence level.`
