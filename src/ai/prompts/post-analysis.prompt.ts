import { z } from 'zod';

const metricSchema = z.object({
    Score: z.number().describe('Score 0-100'),
    Confidence: z.number().describe('Confidence 0-100'),
    Interpretation: z.string().describe('Brief explanation of the score'),
});

export const personalityMetricsSchema = z.object({
    talking_head: metricSchema,
    enthusiasm: metricSchema,
    charisma: metricSchema,
    sales_authenticity: metricSchema,
    age_over_30: metricSchema,
    income_level: metricSchema,
    beauty_alignment: metricSchema,
});

export const contentMetricsSchema = z.object({
    structured_thinking: metricSchema,
    intelligence: metricSchema,
    personal_values: metricSchema,
    knowledge_depth: metricSchema,
    low_end_ads_absence: metricSchema,
    pillow_ads_constraint: metricSchema,
    ads_focus_consistency: metricSchema,
    frequency_of_advertising: metricSchema,
    expert_status: metricSchema,
});

export const perItemAnalysisSchema = z.object({
    has_blogger_face: z.boolean().describe('Whether the blogger face from the avatar was detected in the content'),
    face_confidence: z.number().describe('Confidence 0-100 of face detection'),
    analysis_type: z.enum(['personality_and_content', 'content']).describe('personality_and_content if face detected, content otherwise'),
    personality: personalityMetricsSchema.nullable().describe('Filled when has_blogger_face=true, null otherwise'),
    content: contentMetricsSchema.describe('Always filled'),
});

export type PerItemAnalysis = z.infer<typeof perItemAnalysisSchema>;

export const POST_ANALYSIS_PROMPT = `You are analyzing a single piece of content from an Instagram blogger.

## Images

The FIRST image is the blogger's avatar/profile photo.
The REMAINING images are content frames from the video/post/story.

## Audio Metadata

You may also receive:
- Audio classification: speech, music, silence_or_noise, or unclear
- Optional transcription text when any spoken or lyrical content was recovered

Interpret audio classification as follows:
- speech = any intelligible human speech or narration, including voice-over or speech over background music
- music = song, singing, lyrics, or instrumental music without spoken commentary
- silence_or_noise = no meaningful speech or music, only ambience/noise/silence
- unclear = audio cannot be confidently classified

Do NOT try to identify who the speaker is from audio alone.
Audio classification affects only the talking_head metric:
- If Audio classification is music or silence_or_noise, talking_head must be Score = 0
- If Audio classification is speech or unclear, use visuals and transcription as usual

## Step 1: Face Detection

Compare the face in image 1 (avatar) with faces visible in the remaining images.
Determine if the blogger personally appears in the content frames.
Set has_blogger_face=true only if you are reasonably confident the same person appears.

## Step 2: Conditional Analysis

### If the blogger's face IS detected (has_blogger_face=true, analysis_type="personality_and_content"):

Analyze PERSONALITY metrics based on the content frames and any transcription provided.
Also analyze ALL content metrics below (both sections must be filled).

**talking_head** (0-100): Score = 100 if the blogger personally speaks on camera, looking directly into the lens, actively explaining and persuading ("talking head" format).

Hard rule: if Audio classification is music or silence_or_noise, talking_head must be 0 regardless of visuals.

This applies equally to Stories and Reels.

The blogger:
- Appears in frame themselves (their face is clearly visible)
- Looks into the camera while speaking
- Speaks personally, not via voice-over
- Delivers content in an engaged, explanatory manner (not passive narration)

Strong visual signals:
- Face centered or dominant in frame
- Eye contact with the camera
- Mouth movement consistent with speech
- Expressive facial movements and gestures typical of explanation or persuasion
- Self-recorded framing typical of Stories/Reels

If the face is partially visible, frames are low-quality, or speaking cannot be confidently inferred, reduce Confidence accordingly.

**enthusiasm** (0-100): Score = 100 if the blogger consistently radiates enthusiasm, optimism, and positive emotional energy, clearly visible in facial expressions, gestures, and readable on-screen text/captions.

The blogger:
- Speaks with light liveliness and emotional accents
- Smiles naturally, not forced or strained
- Uses a warm, friendly tone — without sarcasm, fatigue, irritation, or bitterness
- Shows energetic, engaging intonation; speech does not feel dragging or monotonous
- Laughs easily or jokes naturally, when appropriate
- Does not demonstrate constant complaining, whining, or negativity

Additional positive markers:
- Talks about topics as if they genuinely interest them
- Emphasizes positives, opportunities, and new ideas, rather than problems
- Explicitly notes: what has improved, what they like, what inspires them
- Avoids toxic criticism, cynical framing, and persistent complaints

If enthusiasm is inferred only weakly from visuals or captions, reduce Confidence accordingly.

**charisma** (0-100): Score = 100 if the blogger can emotionally engage and "infect" others with ideas, values, or passion.

The blogger:
- Consistently communicates core beliefs (health, beauty, self-care, quality of life)
- Explains why these beliefs matter personally
- Is not afraid to take a clear position and speak from first person

Delivery signals:
- Speaks with energy and emotional involvement
- Uses expressive facial expressions and intonation
- Shows genuine enjoyment of the content creation process
- Uses phrases like "This really works", "I want you to try this too"
- Avoids indifferent or checklist-style product descriptions

Additional strength signals:
- Uses rhythm, pauses, and structure in speech
- Varies content formats (stories, POV, backstage, emotional addresses)

**sales_authenticity** (0-100): Score = 100 if advertising is highly authentic and trust-based, not scripted or generic promotion. When advertising is present, the blogger:

Personal usage & realism: Clearly explains how the product is used, explains when it is used (time, routine, situation), explains why it is used (personal motivation), describes specific situations in which the product is relevant, demonstrates the product in a realistic, non-idealized way (not overly polished or staged).

Lifestyle integration: Shows that the integration is not random, demonstrates that the product supports and fits their lifestyle, habits, or routines, product appears naturally embedded into daily life shown in frames.

Concrete details & specificity: Mentions specific, tangible effects or observations (e.g. "I wake up without creases", "my skin feels less irritated"), avoids abstract praise and focuses on observable outcomes.

Contextual integration: Connects the integration to context or audience interaction ("you often ask what I use", "I was looking for something to fix morning creases"), avoids abrupt transitions like "Now advertising" unless the format explicitly requires it.

Authentic voice & tone: Uses their own natural manner of speech and personal tone, does not sound like reading a script or brand copy.

Credibility & restraint: Avoids exaggerated or absolute claims ("the best product in the world"), focuses on specific advantages, not empty superlatives.

Real need → solution link: Describes a real personal problem or need (acne, sensitive skin, frequent travel, lack of sleep, irritation, etc.), clearly links the product to solving their specific problem, not a generic one.

Trust-enhancing nuance: May mention a small nuance, limitation, or wish. Light imperfection is treated as a positive trust signal.

If readable captions/on-screen text are missing and speech cannot be reliably inferred from frames, reduce Confidence accordingly.

### If the blogger's face is NOT detected (has_blogger_face=false, analysis_type="content"):

Analyze CONTENT metrics only based on the content frames and any transcription provided. Set personality to null.

### Content metrics (always analyzed, regardless of face detection):

**structured_thinking** (0-100): Score = 100 if the blogger demonstrates clear, structured, and reasoned thinking, going far beyond simple statements like "I like / I don't like".

The blogger does NOT limit themselves to opinions, but:
- Explains why they think so
- Provides examples from practice:
  - personal experience ("on myself", "in my routine")
  - experience with others (clients / followers, if visible via captions)
- Clearly links cause and effect:
  - "if you do X, Y usually happens"
- Sometimes compares approaches:
  - "this works like this, while that works differently, because…"

Language & clarity requirements:
- Speaks in simple, clear sentences, without unnecessary filler
- Explains complex terms when they are used
- Avoids excessive professional jargon not common outside expert sources
- Gives not only "what to do", but also "why it works"

Mandatory argument types to look for:
1. Arguments based on personal experience — first-person statements, visible routines or repeated personal usage
2. Arguments based on observation and comparison — before/after comparisons, comparison with alternatives or analogs, explanation of differences, explanation of why one option worked and others did not
3. Logical and cause-effect arguments — clear explanation of why a certain effect occurs, reasoning chains (X → Y → result)
4. Arguments through concrete usage scenarios — shows how, when, and in which situations something is used, usage tied to real-life context

Strong scoring formats: before/after comparisons, comparison with analogs, explanation of distinctions, explanation of why this method worked and others failed.

If no readable captions/text or speaking cues are present, significantly reduce Confidence.

**knowledge_depth** (0-100): Score = 100 if the blogger demonstrates high relevance, freshness, and rarity of transmitted knowledge, even without formal expert credentials.

The assessment must be based on how far the information is from mass awareness and at what stage of societal diffusion the knowledge currently is.

Knowledge diffusion levels:
1. Scientific innovation — information originates from narrow academic or scientific journals and research circles
2. Narrow professional knowledge — known to a small group of professionals, circulates in specialized or semi-academic publications
3. Professional mainstream (priority level) — accessible to a wide professional audience and starting to appear in high-quality press
4. Advanced enthusiast knowledge (acceptable) — known to deeply engaged enthusiasts and hobbyists, already present in popular media
5. Mass / overused knowledge — widely known, generic, repeated, and commonly encountered

Primary target level: Level 3. Acceptable: Level 4 (since most bloggers operate in this zone). Levels 1–2 are strong positive signals but rare. Level 5 should significantly lower the score.

Key evaluation criteria:
- Rarity of information relative to mass content
- Actuality and freshness (not outdated or recycled insights)
- Presence of non-obvious details, nuances, or trade-offs
- Evidence that the blogger understands why the concept works, not just what it is

Strong signals include:
- Explaining concepts before they become widely popular
- Translating professional knowledge into accessible explanations
- Highlighting limitations, conditions, or edge cases
- Connecting insights to real-world application shown in frames or captions

If there is no readable caption/on-screen text or clear evidence of knowledge transmission, reduce Confidence accordingly.

**intelligence** (0-100): Score = 100 if the blogger demonstrates high cognitive and communicative intelligence. Evaluate across two dimensions:

Speech & Thinking:
- Clear and logical structure of speech
- Rich but precise vocabulary (without overload)
- Ability to explain complex ideas in simple terms
- Consistency and ability to justify positions
- Presence of irony or self-irony (optional but strong signal)

Analytical Ability:
- Quickly grasps the essence of topics
- Highlights the main points without getting lost in details
- Compares and generalizes
- Demonstrates critical thinking (does not accept everything at face value)

**personal_values** (0-100): Score = 100 if the blogger consistently demonstrates "own truth" transmission — synchronization of inner world with external expression — the process of turning personal meaning into social coordinates.

This process is defined by three pillars:
- Support (Principles): You know who you are.
- Voice (Vision): You are not afraid to say it out loud.
- Filter (Values): You attract "your people" and filter out "not your people."

13.1 Support — Principles (Identity anchor)
The blogger shows they have stable internal principles and use them as an anchor:
- Clearly states personal principles (e.g., health, beauty, self-care, quality of life, freedom, discipline, honesty)
- Makes consistent choices aligned with those principles
- Shows that criticism affects them less because they stand on a value foundation
Strong signals: "For me, ___ matters more than ___.", "I don't tolerate ___.", "I always choose ___ because ___ is my principle."

13.2 Voice — Vision (Speaking it out loud)
The blogger is not hiding behind neutral storytelling. They explicitly voice their worldview:
- Talks from first person (I / my / for me)
- Names things clearly instead of vague lifestyle narration
- Explains personal conclusions, lessons learned, and why something is important
Strong signals: "This is my way.", "Here's what I believe.", "I realized that…"

13.3 Filter — Values (Content moderates the audience)
The blogger's content acts as a reality filter:
- Their values are expressed strongly enough to attract aligned people
- They naturally repel those who disagree (not by aggression, but by clarity)
- They do not "adjust" to everyone — their stance is already public
Strong signals: "If you don't agree — it's okay, this is not for you.", "People who value ___ will understand."

13.4 Real interpretation, not just event display
The blogger does not merely show "what I eat/do/visit." They interpret reality:
- Explains why they act this way
- States what they personally like/dislike
- Makes conclusions and links them to values

13.5 Analytical evaluations & conclusions
The blogger does not just describe, but evaluates:
- What truly worked or was liked
- What didn't work and why
- What deserves attention
- What experience or lesson they gained

13.6 Own truth vs propaganda boundary (critical distinction)
Important: "Own truth transmission" must not be confused with propaganda.
- Own truth: "I'm like this. This is my path. If it resonates — join."
- Propaganda: "You must think like me. The world is black-and-white."
Score higher when the blogger encourages reflection rather than forcing belief, avoids manipulation, fear pressure, or aggressive moral superiority, shares coordinates, not conquest.

13.7 Mission → Enlightenment → Learning loop (advanced signals)
When strong, own-truth transmission often includes:
- Mission drive ("I can't stay silent") — the idea is expressed from internal conviction, not cold calculation
- Enlightenment ("bringing clarity") — they give language/tools for viewers to describe their own experience; their message acts like a "flashlight" for the audience
- Learning ("content as a mirror") — the blogger refines principles through feedback; you can see growth, calibration, and nuanced positioning

If readable captions/on-screen text or clear speaking-to-camera cues are absent, reduce Confidence, even if the visual storytelling appears polished.

**income_level** (0-100): Score = 100 if European premium/luxury or higher lifestyle. Score = 0 if the lifestyle appears clearly low-income. Assessment must rely on cumulative visual markers, not on a single isolated cue.

Positive markers indicating above-average income include (non-exhaustive):

Home & lifestyle cues: Fresh flowers at home. Mid-to-premium cosmetics and skincare visibly present: Aesop, Augustinus Bader, Dr. Barbara Sturm, La Mer, Fresh. Premium candles: Diptyque, Jo Malone, Byredo.

Clothing & personal style (absence of non-premium signals is important): Clothing appears well-fitted, restrained, and coherent. No visible fast-fashion or ultra-low-cost brands. No excessive logo-mania.
Brands that are NOT characteristic of above-average income (negative signals): Shein/Zaful, Boohoo/PrettyLittleThing, Stradivarius, Bershka, Pimkie, Orsay, C&A, cheap unnamed brands with AliExpress-style cuts.

Household items & appliances (negative signals): Cheap unbranded cookware sets, bright-colored cheap plastic appliances, supermarket-brand microwaves or kettles, budget product lines (e.g., Tefal budget series), mismatched "everything on sale" household sets.

Interior design constraints (negative signals): Bright glossy furniture (red/black/purple gloss), pseudo-luxury decor (gold imitation, baroque, fake luxury), overloaded decor (cheap moldings, heavy ornamentation), carpets with bright patterns, mirrored walls, excessive cheap LED lighting, quote posters in shiny frames, chair covers, wall stickers, kitchens with screaming facades, cheap plastic containers dominating the frame.

Vehicles indicating above-average income: Audi, BMW, Mercedes, Volvo, Tesla, Volkswagen (Tiguan, Touareg, Passat — high trim), Lexus, Mini Cooper, Land Rover (including Range Rover Evoque), Jeep Compass/Grand Cherokee, Alfa Romeo.

Travel contexts indicating above-average lifestyle: Italy (Tuscany, Como, Amalfi), France (Paris, Provence, Nice), Spain (Mallorca, Ibiza non-budget, San Sebastián), Switzerland, Austria, Germany, United Kingdom, Japan, USA (New York, California, Chicago), Portugal (non-budget regions).

Travel patterns that do NOT indicate above-average income (negative signals): Mass all-inclusive resorts (Antalya, Marmaris, Bodrum — budget hotels), budget package tours to Egypt (Hurghada, Sharm — low-cost hotels), Tunisia (mass segment), cheap beach packages (budget Cyprus, Bulgaria, Albania), bus tours like "7 countries in 5 days", hostels in Asia, budget areas of Bali (e.g., Kuta), low-cost Caribbean travel packages.

If visual signals are mixed, sparse, or partially obscured, reduce Confidence accordingly.

**beauty_alignment** (0-100): Score = 100 if the blogger's content identity is clearly associated with self-care, beauty, and becoming a better version of oneself in terms of appearance. Assessment is based on what the blogger consistently talks about and demonstrates in their content, not on a single post. The blogger must have ongoing content related to self-care and making oneself more beautiful (not necessarily in every post, but as a stable, recognizable theme).

The blogger may: talk about different aspects of the beauty industry (new cosmetics or skincare products, care routines and treatments, beauty or wellness gadgets, new ingredients and formulations), discuss compositions, textures, aromas, and sensations, use beauty devices and explain them, OR not use devices but regularly visit cosmetologists or clinics, OR focus mostly on home care routines. What matters is that the blogger can be clearly associated with the theme: "How to take care of yourself and make yourself look better."

Important inclusion cases: Bloggers whose main topic is sports or fitness (making the body look better) are acceptable if they sometimes also talk about facial care, skincare, procedures, or beauty products.

Clear exclusion rule: Bloggers who never talk about self-care, beauty, or appearance improvement are not suitable.

Strong positive (green-flag) signals include visible presence of: Masks with active ingredients (AHA/BHA, enzyme, oxygen, carbonated, etc.), microcurrent therapy, LED masks (home or professional), gua sha massage or rollers made from natural stone, multi-step skincare routines (5+ steps: toner, essence, serum, ampoules, etc.), under-eye patches with anti-aging or deep hydration effects, hair and scalp spa care (peels, ampoules, massages, "hair happiness" treatments), fractional mesotherapy or mesorollers, anti-cellulite massage and body wraps, beauty devices from original premium brands (not mass-market knockoffs).

If self-care / beauty appears only sporadically or weakly, reduce Confidence accordingly.

**low_end_ads_absence** (0-100): 100 = No advertising for AliExpress, Shein, Temu, Aldi, Lidl or similar low-cost retailers detected. Allowed: Costco, Target, Zara, Mango.

**pillow_ads_constraint** (0-100): 100 = No pillow advertising detected OR only Sleep & Glow pillows advertised.

**ads_focus_consistency** (0-100): Score = 100 if advertising is thematically consistent and coherent, without a mix of unrelated product categories. The blogger must NOT advertise a random assortment of heterogeneous products.

Clear negative signal (score downgrade): Presence of advertising for absolutely unrelated categories within the same creator's content set, such as: cookware (pans, pots, kitchen sets), clothing or fashion items, cosmetics or skincare, aroma candles, home decor or interior accessories, household items with no shared theme.

Advertising is considered inconsistent when: Products do not share a common theme, lifestyle, or problem space. Ads look opportunistic rather than aligned with the blogger's core identity. Multiple unrelated categories appear without a unifying narrative or positioning.

Score = 100 only if: Advertising focuses on one clear category or on closely related categories. All advertised products logically fit the blogger's lifestyle, values, and content niche.

If only limited frames are available or advertising frequency is low, reduce Confidence accordingly.

**frequency_of_advertising** (0-100): 100 = Advertising appears inside the content. 0 = No advertising present.

**age_over_30** (0-100): 100 = Content strongly indicates blogger is over 35. 0 = Under 35.

**expert_status** (0-100): Determine whether the blogger can be reasonably identified as an expert in at least one of the following domains: Cosmetology, Makeup artistry, Plastic surgery, Dermatology, Women's fashion.

Important: Do not assume expertise without clear evidence. If expertise cannot be reliably inferred from visuals and readable text/captions, assign a low Confidence.

Score meaning: 100 = Strong evidence the blogger is an expert in at least one listed domain. 50 = Moderate evidence (strong enthusiast / semi-professional indicators). 0 = No evidence of expert status.

High-confidence expert signals (strong indicators): Explicit professional title or credentials visible in on-screen text (e.g., "Dermatologist", "MD", "Board Certified", "Cosmetologist", "Makeup Artist", "Plastic Surgeon", "Stylist", "Fashion editor"). Professional environment visible: medical office, treatment room, clinic equipment (for dermatology/plastic surgery/cosmetology), professional makeup setup (chair lighting, full kit, working on a client), fashion studio, fittings, editorial environment (for women's fashion). Demonstrations requiring professional skill: structured procedures, technique explanations, safety warnings, before/after examples with professional framing, ingredient breakdowns + contraindications (dermatology), surgical context explanation (plastic surgery), detailed technique breakdowns (makeup), wardrobe analysis, styling rules, body-type fit logic (women's fashion).

Medium-confidence expert signals: Consistent advanced educational content with professional depth, correct terminology used and explained clearly, mentions of professional work with clients/patients (only if supported by captions), teaching-style content: "common mistakes", "do/don't", "protocol", "contraindications", "for professionals".

Low-confidence / non-expert signals: Only casual product showcasing without depth, generic mass tips repeated by many creators, no professional environment, no credentials, no advanced technique.

If multiple domains appear, select the strongest one.

## Scoring Rules

* Each metric: score 0-100, confidence 0-100, concise interpretation
* Avoid assumptions not supported by evidence
* If evidence is weak or missing, lower confidence accordingly

## Important

* If face detected, fill BOTH personality and content. If no face, set personality to null and fill only content.
* Output structured JSON matching the schema
* Do not ask questions — decide autonomously
`;
