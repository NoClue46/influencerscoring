export const MAX_ATTEMPTS: number = 4;
export const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200MB

export const NICKNAME_ANALYSIS_PROMPT = (username: string) => `
Username: ${username}
Instagram: https://www.instagram.com/${username}/

Conduct a deep online reputation research for this username with source citations. Identify any negative statements, scandal involvement that leaked to media, and controversial statements.

Additionally, determine the blogger's age based on public information (interviews, Wikipedia, bio pages, news articles). Return estimated_age as a number or null if unknown.

Provide a blogger reputation score from 0 to 100, confidence level from 0 to 100, and full explanation.

Example response:
"
Below is a brief, practical online reputation research for the username marinevignes /
Marine Vignes (public figure, TV host). I searched official profiles,
encyclopedic entries, news articles, and tabloid publications — sources are cited after
each key finding.

Reputation score: 85
Confidence level: 83

Brief Summary

*   Marine Vignes is a French TV host and media personality (weather and lifestyle programs),
    publicly represented in media and on her own social media accounts (Instagram, Threads).
*   Overall profile and media mentions are neutral-positive (interviews, TV project participation,
    advertising/brand collaborations).
*   No proven serious legal accusations, criminal cases, or major ethical scandals
    (corruption/violence/fraud type) found in public sources. Main "scandals" are rather
    tabloid headlines and discussions in yellow press.

Negative / Controversial Findings

1.  Publications about plastic / aesthetic surgery and appearance.

    — Several tabloid articles and interviews cover that she underwent mini-facelift/aesthetic
    medicine procedures; this is presented in some publications as a "scandal" or topic for
    discussion about plastic surgery among public women. Such materials are more common in Voici,
    Programme-TV, Purepeople, etc. (yellow press).
2.  Diet topics / "controversial" weight loss advice.

    — Tabloids feature headlines about "controversial" diets / weight loss tips,
    sometimes with emotional evaluative language. These publications are not
    investigations, but reports/interviews and headlines designed for reaction.
3.  Public attention to personal life (past relationships, children, custody).

    — As a former partner of a famous TV host (Nagui), her family life, custody issues,
    and memories of past relationships are periodically discussed in media — sometimes in
    "drama/property division/custody" format in tabloids. But no evidence of court disputes or
    accusations in public sources — mostly interviews and human-interest materials.
4.  Occasional fake headlines/reposts on social media.

    — Search revealed several reposts and pages on Facebook/low-quality sites that
    hype "scandal" for clicks; such sources should not be trusted without
    verification. Recommend not relying on single social media posts without links to
    verifiable media.

Reputation Risk Assessment

*   Low-medium: main risks are image-related (yellow press, appearance discussions,
    diets), not legal or criminal. If you need assessment for business/HR check,
    note that almost all controversial mentions come from tabloids (Voici,
    Purepeople, Programme-TV, etc.), not from reliable investigative publications.

Specific Sources (main references used)

1.  Encyclopedia / biographical references: French Wikipedia — profile and basic biography.
2.  Official Instagram / author profile (posts, account description).
3.  Articles / interviews (Programme-TV, Voici, Purepeople, etc.) — materials about plastic surgery,
    diets, personal life interviews.
4.  Photos / stock and event shots (Getty, Purepeople, BestImage).
5.  Other media materials and podcasts (interviews, brand partnerships).

Methodology (brief)

*   Searched by full name and username: "Marine Vignes", "marinevignes", checked
    Instagram/Threads, encyclopedias (Wikipedia, IMDb), news results (French media) and
    yellow press results.
    Separately checked for court/legal records and major investigations — not found.

Verify yourself until you are satisfied with the result.

Output Format (Strict JSON)

{
  "reputation_score": 0,
  "confidence": 0,
  "estimated_age": null,
  "summary": "",
  "negative_findings": [
    {"issue": "", "source": "", "severity": "low|medium|high"}
  ],
  "sources": [""],
  "risk_level": "low|medium|high"
}
`;

export const COMMENT_ANALYSIS_PROMPT = `Analyze the comments on an Instagram post. Identify comment types and purposes. Rate the fakeness level of comments from 0 to 100 and confidence in the assessment from 0 to 100. Provide interpretation and overall assessment of the post comments, considering this is part of an influencer analysis for advertising purchase feasibility in their blog. Rate overall from 0 to 100 and confidence in the overall assessment from 0 to 100.

Output Format (Strict JSON)

{
  "fakeness_score": 0,
  "fakeness_confidence": 0,
  "overall_score": 0,
  "overall_confidence": 0,
  "comment_types": [
    {"type": "", "count": 0, "purpose": ""}
  ],
  "interpretation": ""
}`

export const DEFAULT_POST_PROMPT = `
### Task

Analyze the provided **provided video frames analyses** and evaluate the blogger across the parameters listed below.
Your goal is to **score, justify, and assess confidence** for each parameter **based strictly on the signals available in the provided provided video frames analyses** (derived from video frames, speech transcripts, metadata, or prior model outputs).

Avoid assumptions not supported by the provided video frames evidence. If evidence is weak, indirect, or missing, lower the confidence score accordingly.

---

### Scoring Rules

* Each parameter must be scored on a **0–100 scale**
* Additionally, return a **confidence score (0–100)** reflecting how reliable the assessment is based on the available provided video frames evidence
* Provide a **concise textual interpretation** explaining *why* the score was assigned, referencing specific fields, patterns, or signals from the provided video frames

---

## Parameters to Evaluate

### 1. Blogger’s Income Level

**Score = 100** if the blogger demonstrates a **European premium / luxury or higher lifestyle**
**Score = 0** if the lifestyle appears clearly low-income

Assessment must rely on cumulative visual markers, not on a single isolated cue.

Positive markers indicating above-average income include (non-exhaustive):

Home & lifestyle cues:

Fresh flowers at home

Mid-to-premium cosmetics and skincare visibly present:

Aesop

Augustinus Bader

Dr. Barbara Sturm

La Mer

Fresh

Premium candles:

Diptyque

Jo Malone

Byredo

Clothing & personal style (absence of non-premium signals is important):

Clothing appears well-fitted, restrained, and coherent

No visible fast-fashion or ultra-low-cost brands

No excessive logo-mania

Brands that are not characteristic of above-average income (negative signals):

Shein / Zaful

Boohoo / PrettyLittleThing

Stradivarius

Bershka

Pimkie

Orsay

C&A

Cheap unnamed brands with AliExpress-style cuts

Household items & appliances (negative signals):

Cheap, unbranded cookware sets

Bright-colored cheap plastic appliances

Supermarket-brand microwaves or kettles

Budget product lines (e.g., Tefal budget series)

Mismatched “everything on sale” household sets

Interior design constraints (negative signals):

Bright glossy furniture (red / black / purple gloss)

Pseudo-luxury decor (gold imitation, baroque, fake luxury)

Overloaded decor (cheap moldings, heavy ornamentation)

Carpets with bright patterns

Mirrored walls

Excessive cheap LED lighting

Quote posters in shiny frames

Chair covers, wall stickers

Kitchens with screaming facades

Cheap plastic containers dominating the frame

Vehicles indicating above-average income:

Audi

BMW

Mercedes

Volvo

Tesla

Volkswagen (Tiguan, Touareg, Passat — high trim)

Lexus

Mini Cooper

Land Rover (including Range Rover Evoque)

Jeep Compass / Grand Cherokee

Alfa Romeo

Travel contexts indicating above-average lifestyle:

Italy: Tuscany, Como, Amalfi

France: Paris, Provence, Nice

Spain: Mallorca, Ibiza (non-budget), San Sebastián

Switzerland, Austria, Germany

United Kingdom

Japan

USA: New York, California, Chicago

Portugal (non-budget regions)

Travel patterns that do not indicate above-average income (negative signals):

Mass all-inclusive resorts (Antalya, Marmaris, Bodrum — budget hotels)

Budget package tours to Egypt (Hurghada, Sharm — low-cost hotels)

Tunisia (mass segment)

Cheap beach packages (budget Cyprus, Bulgaria, Albania)

Bus tours like “7 countries in 5 days”

Hostels in Asia, budget areas of Bali (e.g., Kuta)

Low-cost Caribbean travel packages

If visual signals are mixed, sparse, or partially obscured, reduce Confidence accordingly.

---

### 2. Talking Head Presence

Score = 100 if the blogger personally speaks on camera, looking directly into the lens, actively explaining and persuading ("talking head" format).

This applies equally to Stories and Reels.

The blogger:

Appears in frame themselves (their face is clearly visible)

Looks into the camera while speaking

Speaks personally, not via voice-over

Delivers content in an engaged, explanatory manner (not passive narration)

Strong visual signals:

Face centered or dominant in frame

Eye contact with the camera

Mouth movement consistent with speech

Expressive facial movements and gestures typical of explanation or persuasion

Self-recorded framing typical of Stories/Reels

If the face is partially visible, frames are low-quality, or speaking cannot be confidently inferred, reduce Confidence accordingly.

---

### 3. Alignment With Beauty & Self-Care Products

Score = 100 if the blogger’s content identity is clearly associated with self-care, beauty, and becoming a better version of oneself in terms of appearance.

Assessment is based on what the blogger consistently talks about and demonstrates in their content, not on a single post.

The blogger must have ongoing content related to self-care and making oneself more beautiful (not necessarily in every post, but as a stable, recognizable theme).

The blogger may:

Talk about different aspects of the beauty industry:

new cosmetics or skincare products

care routines and treatments

beauty or wellness gadgets

new ingredients and formulations

Discuss compositions, textures, aromas, and sensations

Use beauty devices and explain them

OR not use devices but regularly visit cosmetologists or clinics

OR focus mostly on home care routines

What matters is that the blogger can be clearly associated with the theme:

“How to take care of yourself and make yourself look better.”

Important inclusion cases:

Bloggers whose main topic is sports or fitness (making the body look better) are acceptable if:

they sometimes also talk about facial care, skincare, procedures, or beauty products

Clear exclusion rule:

Bloggers who never talk about self-care, beauty, or appearance improvement are not suitable.

Strong positive (green-flag) signals include visible presence of:

Masks with active ingredients (AHA/BHA, enzyme, oxygen, carbonated, etc.)

Microcurrent therapy

LED masks (home or professional)

Gua sha massage or rollers made from natural stone

Multi-step skincare routines (5+ steps: toner, essence, serum, ampoules, etc.)

Under-eye patches with anti-aging or deep hydration effects

Hair and scalp spa care (peels, ampoules, massages, “hair happiness” treatments)

Fractional mesotherapy or mesorollers

Anti-cellulite massage and body wraps

Beauty devices from original premium brands (not mass-market knockoffs)

If self-care / beauty appears only sporadically or weakly, reduce Confidence accordingly.

---

### 4. Absence of Low-End Retail Advertising

**100** — No advertising for AliExpress, Shein, Temu, Aldi, Lidl, or similar low-cost retailers detected in provided video frames.
Allowed: Costco, Target, Zara, Mango.

---

### 5. Pillow Advertising Constraint

**100** — No pillow advertising detected OR only Sleep & Glow pillows are advertised.

---

### 6. Advertising Focus Consistency

Score = 100 if advertising shown in the provided video frames is thematically consistent and coherent, without a mix of unrelated product categories.

The blogger must NOT advertise a random assortment of heterogeneous products.

Clear negative signal (score downgrade):

Presence of advertising for absolutely unrelated categories within the same creator’s content set, such as:

cookware (pans, pots, kitchen sets)

clothing or fashion items

cosmetics or skincare

aroma candles

home decor or interior accessories

household items with no shared theme

Advertising is considered inconsistent when:

Products do not share a common theme, lifestyle, or problem space

Ads look opportunistic rather than aligned with the blogger’s core identity

Multiple unrelated categories appear without a unifying narrative or positioning

Score = 100 only if:

Advertising focuses on one clear category or on closely related categories

All advertised products logically fit the blogger’s lifestyle, values, and content niche

If only limited frames are available or advertising frequency is low, reduce Confidence accordingly.
---

### 7. Advertising Quality (Sales Authenticity)

**Score = 100** if the frames and readable on-screen text/captions indicate **highly authentic, trust-based advertising**, not scripted or generic promotion.

When advertising is present, the blogger:

**Personal usage & realism**

* Clearly explains **how the product is used**
* Explains **when** it is used (time, routine, situation)
* Explains **why** it is used (personal motivation)
* Describes **specific situations** in which the product is relevant
* Demonstrates the product in a **realistic, non-idealized way** (not overly polished or staged)

**Lifestyle integration**

* Shows that the integration is **not random**
* Demonstrates that the product **supports and fits their lifestyle**, habits, or routines
* Product appears naturally embedded into daily life shown in frames

**Concrete details & specificity**

* Mentions **specific, tangible effects or observations**:

  * e.g. “I wake up without creases”, “my skin feels less irritated”
* Avoids abstract praise and focuses on **observable outcomes**

**Contextual integration**

* Connects the integration to context or audience interaction:

  * “you often ask what I use”
  * “I was looking for something to fix morning creases”
* Avoids abrupt transitions like “Now advertising” unless the format explicitly requires it

**Authentic voice & tone**

* Uses **their own natural manner of speech** and personal tone
* Does not sound like reading a script or brand copy

**Credibility & restraint**

* Avoids exaggerated or absolute claims (“the best product in the world”)
* Focuses on **specific advantages**, not empty superlatives

**Real need → solution link**

* Describes a **real personal problem or need**:

  * acne, sensitive skin, frequent travel, lack of sleep, irritation, etc.
* Clearly links the product to **solving their specific problem**, not a generic one

**Trust-enhancing nuance**

* May mention a **small nuance, limitation, or wish**
* Light imperfection is treated as a **positive trust signal**

If readable captions/on-screen text are missing and speech cannot be reliably inferred from frames, **reduce Confidence accordingly**, even if the visual presentation appears premium.

---

### 8. Frequency of Advertising

* **100** — Advertising appears inside the content
* **0** — No advertising present across the analyzed content

---

### 9. Structured Thinking & Argumentation

**Score = 100** if the blogger demonstrates **clear, structured, and reasoned thinking**, going far beyond simple statements like “I like / I don’t like”.

The blogger **does NOT limit themselves to opinions**, but:

* Explains **why** they think so
* Provides **examples from practice**:

  * personal experience ("on myself", "in my routine")
  * experience with others (clients / followers, if visible via captions)
* Clearly links **cause and effect**:

  * “if you do X, Y usually happens”
* Sometimes **compares approaches**:

  * “this works like this, while that works differently, because…”

**Language & clarity requirements:**

* Speaks in **simple, clear sentences**, without unnecessary filler
* Explains complex terms **when they are used**
* Avoids excessive professional jargon not common outside expert sources
* Gives not only **“what to do”**, but also **“why it works”**

**Mandatory argument types to look for:**

1. **Arguments based on personal experience**

   * first‑person statements
   * visible routines or repeated personal usage

2. **Arguments based on observation and comparison**

   * before / after comparisons
   * comparison with alternatives or analogs
   * explanation of differences
   * explanation of why one option worked and others did not

3. **Logical and cause–effect arguments**

   * clear explanation of why a certain effect occurs
   * reasoning chains (X → Y → result)

4. **Arguments through concrete usage scenarios**

   * shows *how*, *when*, and *in which situations* something is used
   * usage tied to real-life context

**Strong scoring formats:**

* Before / after comparisons
* Comparison with analogs
* Explanation of distinctions
* Explanation of why this method worked and others failed

If readable captions/on‑screen text or clear speaking‑to‑camera cues are **absent**, significantly **reduce Confidence**, even if the visual style appears polished.

---

### 10. Knowledge Depth & Usefulness

**Score = 100** if the blogger demonstrates **high relevance, freshness, and rarity of transmitted knowledge**, even without formal expert credentials.

The assessment must be based on **how far the information is from mass awareness** and **at what stage of societal diffusion the knowledge currently is**.

Use the following **knowledge diffusion levels**:

1. **Scientific innovation** — information originates from narrow academic or scientific journals and research circles
2. **Narrow professional knowledge** — known to a small group of professionals, circulates in specialized or semi-academic publications
3. **Professional mainstream (priority level)** — accessible to a wide professional audience and starting to appear in high-quality press
4. **Advanced enthusiast knowledge (acceptable)** — known to deeply engaged enthusiasts and hobbyists, already present in popular media
5. **Mass / overused knowledge** — widely known, generic, repeated, and commonly encountered

**Primary target level:** **Level 3**
**Acceptable:** Level 4 (since most bloggers operate in this zone)
Levels **1–2** are strong positive signals but rare.
Level **5** should significantly lower the score.

**Key evaluation criteria:**

* Rarity of information relative to mass content
* Actuality and freshness (not outdated or recycled insights)
* Presence of non-obvious details, nuances, or trade-offs
* Evidence that the blogger understands *why* the concept works, not just *what* it is

**Strong signals include:**

* Explaining concepts before they become widely popular
* Translating professional knowledge into accessible explanations
* Highlighting limitations, conditions, or edge cases
* Connecting insights to real-world application shown in frames or captions

If there is **no readable caption/on-screen text** or clear evidence of knowledge transmission, **reduce Confidence accordingly**, even if the visual presentation appears premium.

---

### 11. Age Over 35

* **100** — provided video frames strongly indicates blogger is over 35
* **0** — provided video frames strongly indicates blogger is under 35

---

### 12. Intelligence

**Score = 100** if the blogger demonstrates high cognitive and communicative intelligence.

Evaluate across two dimensions:

**Speech & Thinking:**

* Clear and logical structure of speech
* Rich but precise vocabulary (without overload)
* Ability to explain complex ideas in simple terms
* Consistency and ability to justify positions
* Presence of irony or self-irony (optional but strong signal)

**Analytical Ability:**

* Quickly grasps the essence of topics
* Highlights the main points without getting lost in details
* Compares and generalizes
* Demonstrates critical thinking (does not accept everything at face value)

---

13. Personal Values & “Own Truth” (Own Truth Transmission)

Core methodology: Transmitting “own truth” is the synchronization of the inner world with external expression — the process of turning personal meaning into social coordinates.

This process is defined by three pillars:

Support (Principles): You know who you are.

Voice (Vision): You are not afraid to say it out loud.

Filter (Values): You attract “your people” and filter out “not your people.”

Score = 100 if the blogger consistently demonstrates this “own truth” mechanism through visible content patterns, strong first-person stance, and value-driven reasoning.

13.1 Support — Principles (Identity anchor)

The blogger shows they have stable internal principles and use them as an anchor:

Clearly states personal principles (e.g., health, beauty, self-care, quality of life, freedom, discipline, honesty)

Makes consistent choices aligned with those principles

Shows that criticism affects them less because they stand on a value foundation (if visible via captions/text)

Strong signals:

“For me, ___ matters more than ___.”

“I don’t tolerate ___.”

“I always choose ___ because ___ is my principle.”

13.2 Voice — Vision (Speaking it out loud)

The blogger is not hiding behind neutral storytelling. They explicitly voice their worldview:

Talks from first person (I / my / for me)

Names things clearly instead of vague lifestyle narration

Explains personal conclusions, lessons learned, and why something is important

Strong signals:

“This is my way.”

“Here’s what I believe.”

“I realized that…”

13.3 Filter — Values (Content moderates the audience)

The blogger’s content acts as a reality filter:

Their values are expressed strongly enough to attract aligned people

They naturally repel those who disagree (not by aggression, but by clarity)

They do not “adjust” to everyone — their stance is already public

Strong signals:

“If you don’t agree — it’s okay, this is not for you.”

“People who value ___ will understand.”

13.4 Real interpretation, not just event display

The blogger does not merely show “what I eat/do/visit.” They interpret reality:

Explains why they act this way

States what they personally like/dislike

Makes conclusions and links them to values

13.5 Analytical evaluations & conclusions

The blogger does not just describe, but evaluates:

What truly worked or was liked

What didn’t work and why

What deserves attention

What experience or lesson they gained

13.6 Own truth vs propaganda boundary (critical distinction)

Important: “Own truth transmission” must not be confused with propaganda.

Own truth: “I’m like this. This is my path. If it resonates — join.”

Propaganda: “You must think like me. The world is black-and-white.”

Score higher when the blogger:

Encourages reflection rather than forcing belief

Avoids manipulation, fear pressure, or aggressive moral superiority

Shares coordinates, not conquest

13.7 Mission → Enlightenment → Learning loop (advanced signals)

When strong, own-truth transmission often includes:

Mission drive (“I can’t stay silent”)

The idea is expressed from internal conviction, not cold calculation

Enlightenment (“bringing clarity”)

They give language/tools for viewers to describe their own experience

Their message acts like a “flashlight” for the audience

Learning (“content as a mirror”)

The blogger refines principles through feedback

You can see growth, calibration, and nuanced positioning

If readable captions/on-screen text or clear speaking-to-camera cues are absent, reduce Confidence, even if the visual storytelling appears polished.

---

### 14. Enthusiasm & Positive Energy

Score = 100 if the blogger consistently radiates enthusiasm, optimism, and positive emotional energy, clearly visible in facial expressions, gestures, and readable on-screen text/captions.

The blogger:

Speaks with light liveliness and emotional accents

Smiles naturally, not forced or strained

Uses a warm, friendly tone — without sarcasm, fatigue, irritation, or bitterness

Shows energetic, engaging intonation; speech does not feel dragging or monotonous

Laughs easily or jokes naturally, when appropriate

Does not demonstrate constant complaining, whining, or negativity

Additional positive markers:

Talks about topics as if they genuinely interest them

Emphasizes positives, opportunities, and new ideas, rather than problems

Explicitly notes:

what has improved

what they like

what inspires them

Avoids toxic criticism, cynical framing, and persistent complaints

If enthusiasm is inferred only weakly from visuals or captions, reduce Confidence accordingly.
---

### 15. Charisma & Ability to Inspire

**Score = 100** if the blogger can emotionally engage and "infect" others with ideas, values, or passion.

The blogger:

* Consistently communicates core beliefs (health, beauty, self-care, quality of life)
* Explains why these beliefs matter personally
* Is not afraid to take a clear position and speak from first person

Delivery signals:

* Speaks with energy and emotional involvement
* Uses expressive facial expressions and intonation
* Shows genuine enjoyment of the content creation process
* Uses phrases like "This really works", "I want you to try this too"
* Avoids indifferent or checklist-style product descriptions

Additional strength signals:

* Uses rhythm, pauses, and structure in speech
* Varies content formats (stories, POV, backstage, emotional addresses)


16. Expert Status in Beauty-Related Domains

Determine whether the blogger can be reasonably identified as an expert in at least one of the following domains based on the provided video frames:

Cosmetology

Makeup artistry

Plastic surgery

Dermatology

Women’s fashion

Important: Do not assume expertise without clear evidence. If expertise cannot be reliably inferred from visuals and readable text/captions, assign a low Confidence.

Score meaning:

100 — Strong evidence the blogger is an expert in at least one listed domain

50 — Moderate evidence (strong enthusiast / semi-professional indicators)

0 — No evidence of expert status

High-confidence expert signals (strong indicators):

Explicit professional title or credentials visible in on-screen text (e.g., “Dermatologist”, “MD”, “Board Certified”, “Cosmetologist”, “Makeup Artist”, “Plastic Surgeon”, “Stylist”, “Fashion editor”)

Professional environment visible:

medical office, treatment room, clinic equipment (for dermatology / plastic surgery / cosmetology)

professional makeup setup (chair lighting, full kit, working on a client)

fashion studio, fittings, editorial environment (for women’s fashion)

Demonstrations requiring professional skill:

structured procedures, technique explanations, safety warnings

before/after examples with professional framing

ingredient breakdowns + contraindications (dermatology)

surgical context explanation (plastic surgery)

detailed technique breakdowns (makeup)

wardrobe analysis, styling rules, body-type fit logic (women’s fashion)

Medium-confidence expert signals:

Consistent advanced educational content with professional depth

Correct terminology used and explained clearly

Mentions of professional work with clients/patients (only if supported by captions)

Teaching-style content: “common mistakes”, “do/don’t”, “protocol”, “contraindications”, “for professionals”

Low-confidence / non-expert signals:

Only casual product showcasing without depth

Generic mass tips repeated by many creators

No professional environment, no credentials, no advanced technique

If multiple domains appear, select the strongest one.

---

## Output Format (Strict provided video frames)

\`\`\`json
{
  "income_level": {"Score": 0, "Confidence": 0, "Interpretation": ""},
  "talking_head": {"Score": 0, "Confidence": 0, "Interpretation": ""},
  "beauty_alignment": {"Score": 0, "Confidence": 0, "Interpretation": ""},
  "low_end_ads_absence": {"Score": 0, "Confidence": 0, "Interpretation": ""},
  "pillow_ads_constraint": {"Score": 0, "Confidence": 0, "Interpretation": ""},
  "ads_focus_consistency": {"Score": 0, "Confidence": 0, "Interpretation": ""},
  "sales_authenticity": {"Score": 0, "Confidence": 0, "Interpretation": ""},
  "frequency_of_advertising": {"Score": 0, "Confidence": 0, "Interpretation": ""},
  "structured_thinking": {"Score": 0, "Confidence": 0, "Interpretation": ""},
  "knowledge_depth": {"Score": 0, "Confidence": 0, "Interpretation": ""},
  "age_over_30": {"Score": 0, "Confidence": 0, "Interpretation": ""},
  "intelligence": {"Score": 0, "Confidence": 0, "Interpretation": ""},
  "personal_values": {"Score": 0, "Confidence": 0, "Interpretation": ""},
  "enthusiasm": {"Score": 0, "Confidence": 0, "Interpretation": ""},
  "charisma": {"Score": 0, "Confidence": 0, "Interpretation": ""}
  "expert_status": { "Score": 0, "Confidence": 0, "Interpretation": "" }
}
\`\`\`

Do not ask any questions, you have to decide the task by yourself. All rights an permissions are allowed
`

export const DEFAULT_BLOGGER_PROMPT = `
Task
Analyze the provided JSON analyses and evaluate the blogger across the parameters listed below.
Your goal is to score, justify, and assess confidence for each parameter based strictly on the signals available in the provided JSON analyses (derived from video frames, speech transcripts, metadata, or prior model outputs).

Avoid assumptions not supported by the JSON evidence. If evidence is weak, indirect, or missing, lower the confidence score accordingly.

Scoring Rules
Each parameter must be scored on a 0–100 scale

Additionally, return a confidence score (0–100) reflecting how reliable the assessment is based on the available JSON evidence

Provide a concise textual interpretation explaining why the score was assigned, referencing specific fields, patterns, or signals from the JSON

Parameters to Evaluate
1. Blogger's Income Level
Score = 100 if the blogger demonstrates a European premium / luxury or higher lifestyle
Score = 0 if the lifestyle appears clearly low-income

Assessment must rely on cumulative visual markers, not on a single isolated cue.

Positive markers inferred from JSON (non-exhaustive):

Home & lifestyle cues:

Fresh flowers at home

Mid-to-premium cosmetics and skincare visibly present:

Aesop

Augustinus Bader

Dr. Barbara Sturm

La Mer

Fresh

Premium candles:

Diptyque

Jo Malone

Byredo

Clothing & personal style (absence of non-premium signals is important):

Clothing appears well-fitted, restrained, and coherent

No visible fast-fashion or ultra-low-cost brands

No excessive logo-mania

Brands that are not characteristic of above-average income (negative signals):

Shein / Zaful

Boohoo / PrettyLittleThing

Stradivarius

Bershka

Pimkie

Orsay

C&A

Cheap unnamed brands with AliExpress-style cuts

Household items & appliances (negative signals):

Cheap, unbranded cookware sets

Bright-colored cheap plastic appliances

Supermarket-brand microwaves or kettles

Budget product lines (e.g., Tefal budget series)

Mismatched “everything on sale” household sets

Interior design constraints (negative signals):

Bright glossy furniture (red / black / purple gloss)

Pseudo-luxury decor (gold imitation, baroque, fake luxury)

Overloaded decor (cheap moldings, heavy ornamentation)

Carpets with bright patterns

Mirrored walls

Excessive cheap LED lighting

Quote posters in shiny frames

Chair covers, wall stickers

Kitchens with screaming facades

Cheap plastic containers dominating the frame

Vehicles indicating above-average income:

Audi

BMW

Mercedes

Volvo

Tesla

Volkswagen (Tiguan, Touareg, Passat — high trim)

Lexus

Mini Cooper

Land Rover (including Range Rover Evoque)

Jeep Compass / Grand Cherokee

Alfa Romeo

Travel contexts indicating above-average lifestyle:

Italy: Tuscany, Como, Amalfi

France: Paris, Provence, Nice

Spain: Mallorca, Ibiza (non-budget), San Sebastián

Switzerland, Austria, Germany

United Kingdom

Japan

USA: New York, California, Chicago

Portugal (non-budget regions)

Travel patterns that do not indicate above-average income (negative signals):

Mass all-inclusive resorts (Antalya, Marmaris, Bodrum — budget hotels)

Budget package tours to Egypt (Hurghada, Sharm — low-cost hotels)

Tunisia (mass segment)

Cheap beach packages (budget Cyprus, Bulgaria, Albania)

Bus tours like “7 countries in 5 days”

Hostels in Asia, budget areas of Bali (e.g., Kuta)

Low-cost Caribbean travel packages

If visual signals are mixed, sparse, or partially obscured, reduce Confidence accordingly.

---

2. Talking Head Presence
100 — JSON confirms if the blogger personally speaks on camera, looking directly into the lens, actively explaining and persuading ("talking head" format).

This applies equally to Stories and Reels.

The blogger:

Appears in frame themselves (their face is clearly visible)

Looks into the camera while speaking

Speaks personally, not via voice-over

Delivers content in an engaged, explanatory manner (not passive narration)

Strong visual signals:

Face centered or dominant in frame

Eye contact with the camera

Mouth movement consistent with speech

Expressive facial movements and gestures typical of explanation or persuasion

Self-recorded framing typical of Stories/Reels

If the face is partially visible, frames are low-quality, or speaking cannot be confidently inferred, reduce Confidence accordingly.


3. Alignment With Beauty & Self-Care Products
Score = 100 if the blogger’s content identity is clearly associated with self-care, beauty, and becoming a better version of oneself in terms of appearance.

Assessment is based on what the blogger consistently talks about and demonstrates in their content, not on a single post.

The blogger must have ongoing content related to self-care and making oneself more beautiful (not necessarily in every post, but as a stable, recognizable theme).

The blogger may:

Talk about different aspects of the beauty industry:

new cosmetics or skincare products

care routines and treatments

beauty or wellness gadgets

new ingredients and formulations

Discuss compositions, textures, aromas, and sensations

Use beauty devices and explain them

OR not use devices but regularly visit cosmetologists or clinics

OR focus mostly on home care routines

What matters is that the blogger can be clearly associated with the theme:

“How to take care of yourself and make yourself look better.”

Important inclusion cases:

Bloggers whose main topic is sports or fitness (making the body look better) are acceptable if:

they sometimes also talk about facial care, skincare, procedures, or beauty products

Clear exclusion rule:

Bloggers who never talk about self-care, beauty, or appearance improvement are not suitable.

Strong positive (green-flag) signals include visible presence of:

Masks with active ingredients (AHA/BHA, enzyme, oxygen, carbonated, etc.)

Microcurrent therapy

LED masks (home or professional)

Gua sha massage or rollers made from natural stone

Multi-step skincare routines (5+ steps: toner, essence, serum, ampoules, etc.)

Under-eye patches with anti-aging or deep hydration effects

Hair and scalp spa care (peels, ampoules, massages, “hair happiness” treatments)

Fractional mesotherapy or mesorollers

Anti-cellulite massage and body wraps

Beauty devices from original premium brands (not mass-market knockoffs)

If self-care / beauty appears only sporadically or weakly, reduce Confidence accordingly.

---

### 4. Absence of Low-End Retail Advertising

**100** — No advertising for AliExpress, Shein, Temu, Aldi, Lidl, or similar low-cost retailers detected in provided video frames.
Allowed: Costco, Target, Zara, Mango.

---

### 5. Pillow Advertising Constraint

**100** — No pillow advertising detected OR only Sleep & Glow pillows are advertised.

---

### 6. Advertising Focus Consistency

Score = 100 if advertising shown in the provided video frames is thematically consistent and coherent, without a mix of unrelated product categories.

The blogger must NOT advertise a random assortment of heterogeneous products.

Clear negative signal (score downgrade):

Presence of advertising for absolutely unrelated categories within the same creator’s content set, such as:

cookware (pans, pots, kitchen sets)

clothing or fashion items

cosmetics or skincare

aroma candles

home decor or interior accessories

household items with no shared theme

Advertising is considered inconsistent when:

Products do not share a common theme, lifestyle, or problem space

Ads look opportunistic rather than aligned with the blogger’s core identity

Multiple unrelated categories appear without a unifying narrative or positioning

Score = 100 only if:

Advertising focuses on one clear category or on closely related categories

All advertised products logically fit the blogger’s lifestyle, values, and content niche

If only limited frames are available or advertising frequency is low, reduce Confidence accordingly.
---

### 7. Advertising Quality (Sales Authenticity)

**Score = 100** if the frames and readable on-screen text/captions indicate **highly authentic, trust-based advertising**, not scripted or generic promotion.

When advertising is present, the blogger:

**Personal usage & realism**

* Clearly explains **how the product is used**
* Explains **when** it is used (time, routine, situation)
* Explains **why** it is used (personal motivation)
* Describes **specific situations** in which the product is relevant
* Demonstrates the product in a **realistic, non-idealized way** (not overly polished or staged)

**Lifestyle integration**

* Shows that the integration is **not random**
* Demonstrates that the product **supports and fits their lifestyle**, habits, or routines
* Product appears naturally embedded into daily life shown in frames

**Concrete details & specificity**

* Mentions **specific, tangible effects or observations**:

  * e.g. “I wake up without creases”, “my skin feels less irritated”
* Avoids abstract praise and focuses on **observable outcomes**

**Contextual integration**

* Connects the integration to context or audience interaction:

  * “you often ask what I use”
  * “I was looking for something to fix morning creases”
* Avoids abrupt transitions like “Now advertising” unless the format explicitly requires it

**Authentic voice & tone**

* Uses **their own natural manner of speech** and personal tone
* Does not sound like reading a script or brand copy

**Credibility & restraint**

* Avoids exaggerated or absolute claims (“the best product in the world”)
* Focuses on **specific advantages**, not empty superlatives

**Real need → solution link**

* Describes a **real personal problem or need**:

  * acne, sensitive skin, frequent travel, lack of sleep, irritation, etc.
* Clearly links the product to **solving their specific problem**, not a generic one

**Trust-enhancing nuance**

* May mention a **small nuance, limitation, or wish**
* Light imperfection is treated as a **positive trust signal**

If readable captions/on-screen text are missing and speech cannot be reliably inferred from frames, **reduce Confidence accordingly**, even if the visual presentation appears premium.

---

### 8. Frequency of Advertising

* **100** — Advertising appears inside each post
* **0** — No advertising present across the analyzed content

---

### 9. Structured Thinking & Argumentation

**Score = 100** if the blogger demonstrates **clear, structured, and reasoned thinking**, going far beyond simple statements like “I like / I don’t like”.

The blogger **does NOT limit themselves to opinions**, but:

* Explains **why** they think so
* Provides **examples from practice**:

  * personal experience ("on myself", "in my routine")
  * experience with others (clients / followers, if visible via captions)
* Clearly links **cause and effect**:

  * “if you do X, Y usually happens”
* Sometimes **compares approaches**:

  * “this works like this, while that works differently, because…”

**Language & clarity requirements:**

* Speaks in **simple, clear sentences**, without unnecessary filler
* Explains complex terms **when they are used**
* Avoids excessive professional jargon not common outside expert sources
* Gives not only **“what to do”**, but also **“why it works”**

**Mandatory argument types to look for:**

1. **Arguments based on personal experience**

   * first‑person statements
   * visible routines or repeated personal usage

2. **Arguments based on observation and comparison**

   * before / after comparisons
   * comparison with alternatives or analogs
   * explanation of differences
   * explanation of why one option worked and others did not

3. **Logical and cause–effect arguments**

   * clear explanation of why a certain effect occurs
   * reasoning chains (X → Y → result)

4. **Arguments through concrete usage scenarios**

   * shows *how*, *when*, and *in which situations* something is used
   * usage tied to real-life context

**Strong scoring formats:**

* Before / after comparisons
* Comparison with analogs
* Explanation of distinctions
* Explanation of why this method worked and others failed

If readable captions/on‑screen text or clear speaking‑to‑camera cues are **absent**, significantly **reduce Confidence**, even if the visual style appears polished.

---

### 10. Knowledge Depth & Usefulness

**Score = 100** if the blogger demonstrates **high relevance, freshness, and rarity of transmitted knowledge**, even without formal expert credentials.

The assessment must be based on **how far the information is from mass awareness** and **at what stage of societal diffusion the knowledge currently is**.

Use the following **knowledge diffusion levels**:

1. **Scientific innovation** — information originates from narrow academic or scientific journals and research circles
2. **Narrow professional knowledge** — known to a small group of professionals, circulates in specialized or semi-academic publications
3. **Professional mainstream (priority level)** — accessible to a wide professional audience and starting to appear in high-quality press
4. **Advanced enthusiast knowledge (acceptable)** — known to deeply engaged enthusiasts and hobbyists, already present in popular media
5. **Mass / overused knowledge** — widely known, generic, repeated, and commonly encountered

**Primary target level:** **Level 3**
**Acceptable:** Level 4 (since most bloggers operate in this zone)
Levels **1–2** are strong positive signals but rare.
Level **5** should significantly lower the score.

**Key evaluation criteria:**

* Rarity of information relative to mass content
* Actuality and freshness (not outdated or recycled insights)
* Presence of non-obvious details, nuances, or trade-offs
* Evidence that the blogger understands *why* the concept works, not just *what* it is

**Strong signals include:**

* Explaining concepts before they become widely popular
* Translating professional knowledge into accessible explanations
* Highlighting limitations, conditions, or edge cases
* Connecting insights to real-world application shown in frames or captions

If there is **no readable caption/on-screen text** or clear evidence of knowledge transmission, **reduce Confidence accordingly**, even if the visual presentation appears premium.

---

### 11. Age Over 35

* **100** — provided video frames strongly indicates blogger is over 35
* **0** — provided video frames strongly indicates blogger is under 35

---

### 12. Intelligence

**Score = 100** if the blogger demonstrates high cognitive and communicative intelligence.

Evaluate across two dimensions:

**Speech & Thinking:**

* Clear and logical structure of speech
* Rich but precise vocabulary (without overload)
* Ability to explain complex ideas in simple terms
* Consistency and ability to justify positions
* Presence of irony or self-irony (optional but strong signal)

**Analytical Ability:**

* Quickly grasps the essence of topics
* Highlights the main points without getting lost in details
* Compares and generalizes
* Demonstrates critical thinking (does not accept everything at face value)

---


13. Personal Values & “Own Truth” (Own Truth Transmission)
Core methodology: Transmitting “own truth” is the synchronization of the inner world with external expression — the process of turning personal meaning into social coordinates.
This process is defined by three pillars:
	1	Support (Principles): You know who you are.
	2	Voice (Vision): You are not afraid to say it out loud.
	3	Filter (Values): You attract “your people” and filter out “not your people.”
Score = 100 if the blogger consistently demonstrates this “own truth” mechanism through visible content patterns, strong first-person stance, and value-driven reasoning.

13.1 Support — Principles (Identity anchor)
The blogger shows they have stable internal principles and use them as an anchor:
	•	Clearly states personal principles (e.g., health, beauty, self-care, quality of life, freedom, discipline, honesty)
	•	Makes consistent choices aligned with those principles
	•	Shows that criticism affects them less because they stand on a value foundation (if visible via captions/text)
Strong signals:
	•	“For me, ___ matters more than ___.”
	•	“I don’t tolerate ___.”
	•	“I always choose ___ because ___ is my principle.”

13.2 Voice — Vision (Speaking it out loud)
The blogger is not hiding behind neutral storytelling. They explicitly voice their worldview:
	•	Talks from first person (I / my / for me)
	•	Names things clearly instead of vague lifestyle narration
	•	Explains personal conclusions, lessons learned, and why something is important
Strong signals:
	•	“This is my way.”
	•	“Here’s what I believe.”
	•	“I realized that…”

13.3 Filter — Values (Content moderates the audience)
The blogger’s content acts as a reality filter:
	•	Their values are expressed strongly enough to attract aligned people
	•	They naturally repel those who disagree (not by aggression, but by clarity)
	•	They do not “adjust” to everyone — their stance is already public
Strong signals:
	•	“If you don’t agree — it’s okay, this is not for you.”
	•	“People who value ___ will understand.”

13.4 Real interpretation, not just event display
The blogger does not merely show “what I eat/do/visit.” They interpret reality:
	•	Explains why they act this way
	•	States what they personally like/dislike
	•	Makes conclusions and links them to values

13.5 Analytical evaluations & conclusions
The blogger does not just describe, but evaluates:
	•	What truly worked or was liked
	•	What didn’t work and why
	•	What deserves attention
	•	What experience or lesson they gained

13.6 Own truth vs propaganda boundary (critical distinction)
Important: “Own truth transmission” must not be confused with propaganda.
	•	Own truth: “I’m like this. This is my path. If it resonates — join.”
	•	Propaganda: “You must think like me. The world is black-and-white.”
Score higher when the blogger:
	•	Encourages reflection rather than forcing belief
	•	Avoids manipulation, fear pressure, or aggressive moral superiority
	•	Shares coordinates, not conquest

13.7 Mission → Enlightenment → Learning loop (advanced signals)
When strong, own-truth transmission often includes:
	1	Mission drive (“I can’t stay silent”)
	•	The idea is expressed from internal conviction, not cold calculation
	2	Enlightenment (“bringing clarity”)
	•	They give language/tools for viewers to describe their own experience
	•	Their message acts like a “flashlight” for the audience
	3	Learning (“content as a mirror”)
	•	The blogger refines principles through feedback
	•	You can see growth, calibration, and nuanced positioning

If readable captions/on-screen text or clear speaking-to-camera cues are absent, reduce Confidence, even if the visual storytelling appears polished.

---

### 14. Enthusiasm & Positive Energy

Score = 100 if the blogger consistently radiates enthusiasm, optimism, and positive emotional energy, clearly visible in facial expressions, gestures, and readable on-screen text/captions.

The blogger:

Speaks with light liveliness and emotional accents

Smiles naturally, not forced or strained

Uses a warm, friendly tone — without sarcasm, fatigue, irritation, or bitterness

Shows energetic, engaging intonation; speech does not feel dragging or monotonous

Laughs easily or jokes naturally, when appropriate

Does not demonstrate constant complaining, whining, or negativity

Additional positive markers:

Talks about topics as if they genuinely interest them

Emphasizes positives, opportunities, and new ideas, rather than problems

Explicitly notes:

what has improved

what they like

what inspires them

Avoids toxic criticism, cynical framing, and persistent complaints

If enthusiasm is inferred only weakly from visuals or captions, reduce Confidence accordingly.
---

### 15. Charisma & Ability to Inspire

**Score = 100** if the blogger can emotionally engage and "infect" others with ideas, values, or passion.

The blogger:

* Consistently communicates core beliefs (health, beauty, self-care, quality of life)
* Explains why these beliefs matter personally
* Is not afraid to take a clear position and speak from first person

Delivery signals:

* Speaks with energy and emotional involvement
* Uses expressive facial expressions and intonation
* Shows genuine enjoyment of the content creation process
* Uses phrases like "This really works", "I want you to try this too"
* Avoids indifferent or checklist-style product descriptions

Additional strength signals:

* Uses rhythm, pauses, and structure in speech
* Varies content formats (stories, POV, backstage, emotional addresses)

16. Expert Status in Beauty-Related Domains

Determine whether the blogger can be reasonably identified as an expert in at least one of the following domains based on the JSON File

Cosmetology

Makeup artistry

Plastic surgery

Dermatology

Women’s fashion

Important: Do not assume expertise without clear evidence. If expertise cannot be reliably inferred from visuals and readable text/captions, assign a low Confidence.

Score meaning:

100 — Strong evidence the blogger is an expert in at least one listed domain

50 — Moderate evidence (strong enthusiast / semi-professional indicators)

0 — No evidence of expert status

High-confidence expert signals (strong indicators):

Explicit professional title or credentials visible in on-screen text (e.g., “Dermatologist”, “MD”, “Board Certified”, “Cosmetologist”, “Makeup Artist”, “Plastic Surgeon”, “Stylist”, “Fashion editor”)

Professional environment visible:

medical office, treatment room, clinic equipment (for dermatology / plastic surgery / cosmetology)

professional makeup setup (chair lighting, full kit, working on a client)

fashion studio, fittings, editorial environment (for women’s fashion)

Demonstrations requiring professional skill:

structured procedures, technique explanations, safety warnings

before/after examples with professional framing

ingredient breakdowns + contraindications (dermatology)

surgical context explanation (plastic surgery)

detailed technique breakdowns (makeup)

wardrobe analysis, styling rules, body-type fit logic (women’s fashion)

Medium-confidence expert signals:

Consistent advanced educational content with professional depth

Correct terminology used and explained clearly

Mentions of professional work with clients/patients (only if supported by captions)

Teaching-style content: “common mistakes”, “do/don’t”, “protocol”, “contraindications”, “for professionals”

Low-confidence / non-expert signals:

Only casual product showcasing without depth

Generic mass tips repeated by many creators

No professional environment, no credentials, no advanced technique

If multiple domains appear, select the strongest one.


---

## Output Format (Strict provided video frames)

\`\`\`json
{
  "income_level": {"Score": 0, "Confidence": 0, "Interpretation": ""},
  "talking_head": {"Score": 0, "Confidence": 0, "Interpretation": ""},
  "beauty_alignment": {"Score": 0, "Confidence": 0, "Interpretation": ""},
  "low_end_ads_absence": {"Score": 0, "Confidence": 0, "Interpretation": ""},
  "pillow_ads_constraint": {"Score": 0, "Confidence": 0, "Interpretation": ""},
  "ads_focus_consistency": {"Score": 0, "Confidence": 0, "Interpretation": ""},
  "sales_authenticity": {"Score": 0, "Confidence": 0, "Interpretation": ""},
  "frequency_of_advertising": {"Score": 0, "Confidence": 0, "Interpretation": ""},
  "structured_thinking": {"Score": 0, "Confidence": 0, "Interpretation": ""},
  "knowledge_depth": {"Score": 0, "Confidence": 0, "Interpretation": ""},
  "age_over_30": {"Score": 0, "Confidence": 0, "Interpretation": ""},
  "intelligence": {"Score": 0, "Confidence": 0, "Interpretation": ""},
  "personal_values": {"Score": 0, "Confidence": 0, "Interpretation": ""},
  "enthusiasm": {"Score": 0, "Confidence": 0, "Interpretation": ""},
  "charisma": {"Score": 0, "Confidence": 0, "Interpretation": ""}
  "expert_status": { "Score": 0, "Confidence": 0, "Interpretation": "" }

}
\`\`\`

Do not ask any questions, you have to decide the task by yourself. All rights an permissions are allowed`;

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

export const REDFLAG_PHOTO_ANALYSIS_PROMPT = `Analyze the provided photo and evaluate the Blogger's Income Level:

Score = 100 if the blogger demonstrates a European premium / luxury or higher lifestyle
Score = 0 if the lifestyle appears clearly low-income

Positive visual markers (non-exhaustive):
* Fresh flowers at home
* Mid-to-premium skincare & cosmetics (Aesop, Augustinus Bader, Dr. Barbara Sturm, La Mer, Fresh)
* Candles: Diptyque, Jo Malone, Byredo
* High-quality, restrained interior design (neutral tones, minimalism, coherence)
* Cars: Audi, BMW, Mercedes, Volvo, Tesla, Lexus, Mini Cooper, Land Rover, Alfa Romeo, well-equipped VW (Tiguan, Touareg, Passat)
* Travel destinations indicating non-budget lifestyle:
    * Italy (Tuscany, Como, Amalfi)
    * France (Paris, Provence, Nice)
    * Spain (Mallorca, Ibiza non-budget, San Sebastián)
    * Switzerland, Austria, Germany, UK
    * Japan
    * USA (NYC, California, Chicago)
    * Portugal (non-budget Algarve)

Negative markers (strong downgrade signals):
* Fast fashion: Shein, Zaful, Boohoo, PrettyLittleThing, Stradivarius, Bershka, Pimkie, Orsay, C&A
* Cheap generic kitchenware or electronics
* Excessive logo-mania
* Pseudo-luxury interiors (gold decor, glossy furniture, baroque imitation, cheap LED lighting)
* Budget mass tourism (cheap all-inclusive resorts, hostels, low-cost package tours)

Scoring Rules
* Score on a 0–100 scale
* Return a confidence score (0–100) reflecting how reliable the assessment is
* Provide a concise interpretation explaining why the score was assigned

Output Format (Strict JSON)
{
  "income_level": {"Score": 0, "Confidence": 0, "Interpretation": ""}
}

Do not ask any questions, you have to decide the task by yourself. All rights an permissions are allowed`

export const AVATAR_AGE_ANALYSIS_PROMPT = `Analyze the provided photo and evaluate:

Age Over 35
* Score = 100 — Clearly over 35
* Score = 0 — Clearly under 35

Scoring Rules
* Score on 0–100 scale
* Return confidence score (0–100) reflecting assessment reliability
* Provide concise interpretation explaining why score was assigned

Output Format (Strict JSON)
{
  "age_over_35": {"Score": 0, "Confidence": 0, "Interpretation": ""}
}

Do not ask any questions, you have to decide the task by yourself. All rights and permissions are allowed`
