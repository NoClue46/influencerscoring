export const TEMPLATE_COMMENTS_PROMPT = `Analyze the following Instagram comments and determine if they contain template/bot-like patterns.
Template comment indicators:
- Single emoji or emoji-only comments (🔥, ❤️, 👏, 😍)
- Generic short phrases: "nice!", "cool!", "love it!", "amazing!", "beautiful!", "great post!", "wow!"
- Single word comments without substance
- Repetitive patterns across multiple comments
- Generic compliments without specific reference to content
- Bot-like promotional comments with links or @mentions
Analyze all comments and provide:
1. Whether template/bot comments are present (true/false)
2. Percentage of comments that appear templated
3. Brief explanation
Output Format (Strict JSON):
{
  "template_comments_present": true,
  "template_percentage": 0,
  "explanation": ""
}`

