import { z } from 'zod';

const metricSchema = z.object({
    Score: z.number().describe('Score 0-100'),
    Confidence: z.number().describe('Confidence 0-100'),
    Interpretation: z.string().describe('Brief explanation of the score'),
});

export const personalityMetricsSchema = z.object({
    talking_head: metricSchema,
    structured_thinking: metricSchema,
    knowledge_depth: metricSchema,
    intelligence: metricSchema,
    personal_values: metricSchema,
    enthusiasm: metricSchema,
    charisma: metricSchema,
});

export const contentMetricsSchema = z.object({
    income_level: metricSchema,
    beauty_alignment: metricSchema,
    low_end_ads_absence: metricSchema,
    pillow_ads_constraint: metricSchema,
    ads_focus_consistency: metricSchema,
    sales_authenticity: metricSchema,
    frequency_of_advertising: metricSchema,
    age_over_30: metricSchema,
    expert_status: metricSchema,
});

export const perItemAnalysisSchema = z.object({
    has_blogger_face: z.boolean().describe('Whether the blogger face from the avatar was detected in the content'),
    face_confidence: z.number().describe('Confidence 0-100 of face detection'),
    analysis_type: z.enum(['personality_and_content', 'content']).describe('personality_and_content if face detected, content otherwise'),
    personality: personalityMetricsSchema.optional().describe('Filled when has_blogger_face=true'),
    content: contentMetricsSchema.describe('Always filled'),
});

export type PerItemAnalysis = z.infer<typeof perItemAnalysisSchema>;

export const POST_ANALYSIS_PROMPT = `You are analyzing a single piece of content from an Instagram blogger.

## Images

The FIRST image is the blogger's avatar/profile photo.
The REMAINING images are content frames from the video/post/story.

## Step 1: Face Detection

Compare the face in image 1 (avatar) with faces visible in the remaining images.
Determine if the blogger personally appears in the content frames.
Set has_blogger_face=true only if you are reasonably confident the same person appears.

## Step 2: Conditional Analysis

### If the blogger's face IS detected (has_blogger_face=true, analysis_type="personality_and_content"):

Analyze PERSONALITY metrics based on the content frames and any transcription provided.
Also analyze ALL content metrics below (both sections must be filled).

**talking_head** (0-100): Score = 100 if the blogger personally speaks on camera, looking directly into the lens, actively explaining and persuading ("talking head" format). Strong signals: face centered in frame, eye contact with camera, mouth movement consistent with speech, expressive gestures typical of explanation. If face is partially visible or speaking cannot be confidently inferred, reduce Confidence.

**structured_thinking** (0-100): Score = 100 if the blogger demonstrates clear, structured, and reasoned thinking beyond "I like / I don't like". They explain WHY, provide examples from practice, link cause and effect, compare approaches. Look for: arguments based on personal experience, observation/comparison, logical cause-effect chains, concrete usage scenarios. If no readable captions/text or speaking cues are present, significantly reduce Confidence.

**knowledge_depth** (0-100): Score = 100 if the blogger demonstrates high relevance, freshness, and rarity of transmitted knowledge. Use knowledge diffusion levels: Level 3 (professional mainstream) is primary target, Level 4 (advanced enthusiast) is acceptable. Level 5 (mass/overused) should lower score significantly. Key criteria: rarity of information, actuality/freshness, non-obvious details, understanding of WHY something works.

**intelligence** (0-100): Score = 100 if the blogger demonstrates high cognitive and communicative intelligence. Speech & Thinking: clear logical structure, rich precise vocabulary, ability to explain complex ideas simply. Analytical Ability: quickly grasps essence, highlights main points, compares and generalizes, demonstrates critical thinking.

**personal_values** (0-100): Score = 100 if the blogger consistently demonstrates "own truth" transmission — synchronization of inner world with external expression. Three pillars: Support (stable principles), Voice (not afraid to speak), Filter (attracts aligned people). Look for first-person stance, value-driven reasoning, real interpretation (not just event display), analytical evaluations. Must NOT be confused with propaganda.

**enthusiasm** (0-100): Score = 100 if the blogger consistently radiates enthusiasm, optimism, and positive energy. Signals: speaks with liveliness, smiles naturally, warm friendly tone, energetic intonation, laughs/jokes naturally. Avoids complaining, whining, negativity, toxic criticism.

**charisma** (0-100): Score = 100 if the blogger can emotionally engage and inspire others. Signals: consistently communicates core beliefs, explains why they matter personally, speaks with energy and emotional involvement, expressive facial expressions, genuine enjoyment of content creation. Uses rhythm, pauses, structure in speech.

### If the blogger's face is NOT detected (has_blogger_face=false, analysis_type="content"):

Analyze CONTENT metrics based on the content frames and any transcription provided:

**income_level** (0-100): Score = 100 if European premium/luxury or higher lifestyle. Assess via cumulative visual markers: home/lifestyle cues (fresh flowers, premium cosmetics like Aesop/La Mer, premium candles like Diptyque/Jo Malone), clothing (well-fitted, no fast-fashion like Shein/Bershka), vehicles (Audi/BMW/Mercedes/Tesla), travel (Italy/France/Switzerland vs budget all-inclusive). Negative signals: cheap appliances, bright glossy furniture, pseudo-luxury decor.

**beauty_alignment** (0-100): Score = 100 if content identity is clearly associated with self-care, beauty, and appearance improvement. Must be stable recognizable theme. Green-flag signals: masks with active ingredients, microcurrent therapy, LED masks, gua sha, multi-step skincare routines, under-eye patches, beauty devices from premium brands. Sports/fitness bloggers acceptable if they also discuss facial care/skincare.

**low_end_ads_absence** (0-100): 100 = No advertising for AliExpress, Shein, Temu, Aldi, Lidl or similar low-cost retailers detected. Allowed: Costco, Target, Zara, Mango.

**pillow_ads_constraint** (0-100): 100 = No pillow advertising detected OR only Sleep & Glow pillows advertised.

**ads_focus_consistency** (0-100): Score = 100 if advertising is thematically consistent without mix of unrelated product categories. Negative: random assortment of cookware + clothing + cosmetics + candles. Score = 100 only if advertising focuses on one clear category or closely related categories.

**sales_authenticity** (0-100): Score = 100 if advertising is highly authentic and trust-based. Signals: personal usage & realism, lifestyle integration, concrete details & specificity, contextual integration, authentic voice, credibility & restraint, real need-solution link, trust-enhancing nuance.

**frequency_of_advertising** (0-100): 100 = Advertising appears inside the content. 0 = No advertising present.

**age_over_30** (0-100): 100 = Content strongly indicates blogger is over 35. 0 = Under 35.

**expert_status** (0-100): 100 = Strong evidence of expert in cosmetology/makeup/plastic surgery/dermatology/women's fashion. Look for: professional titles, professional environment, demonstrations requiring professional skill. 50 = moderate evidence. 0 = no evidence.

## Scoring Rules

* Each metric: score 0-100, confidence 0-100, concise interpretation
* Avoid assumptions not supported by evidence
* If evidence is weak or missing, lower confidence accordingly

## Important

* If face detected, fill BOTH personality and content. If no face, fill only content.
* Output structured JSON matching the schema
* Do not ask questions — decide autonomously
`;
