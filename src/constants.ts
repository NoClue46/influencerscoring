export const MAX_ATTEMPTS: number = 4;
export const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200MB

export const NICKNAME_ANALYSIS_PROMPT = (username: string) => `
Username: ${username}
Instagram: https://www.instagram.com/${username}/

Conduct a deep online reputation research for this username with source citations. Identify any negative statements, scandal involvement that leaked to media, and controversial statements.

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

export const DEFAULT_POST_PROMPT = `Task
Analyze the provided video frames and evaluate the blogger across the parameters listed below.
Your goal is to score, justify, and assess confidence for each parameter based strictly on the signals available in the provided JSON analyses (derived from video frames, speech transcripts, metadata, or prior model outputs).

Avoid assumptions not supported by the JSON evidence. If evidence is weak, indirect, or missing, lower the confidence score accordingly.

Scoring Rules
Each parameter must be scored on a 0–100 scale

Additionally, return a confidence score (0–100) reflecting how reliable the assessment is based on the available JSON evidence

Provide a concise textual interpretation explaining why the score was assigned, referencing specific fields, patterns, or signals from the JSON

Parameters to Evaluate
1. Blogger’s Income Level
Score = 100 if the blogger demonstrates a European premium / luxury or higher lifestyle
Score = 0 if the lifestyle appears clearly low-income

Positive markers inferred from JSON (non-exhaustive):

Mentions or detections of premium skincare & cosmetics (Aesop, Augustinus Bader, Dr. Barbara Sturm, La Mer, Fresh)

Premium home elements (fresh flowers, designer candles: Diptyque, Jo Malone, Byredo)

High-quality, restrained interior descriptors (neutral palette, minimalism, coherence)

Cars: Audi, BMW, Mercedes, Volvo, Tesla, Lexus, Mini Cooper, Land Rover, Alfa Romeo, well-equipped VW (Tiguan, Touareg, Passat)

Travel locations indicating non-budget lifestyle (Tuscany, Como, Amalfi, Paris, Provence, Nice, Mallorca non-budget, San Sebastián, Switzerland, UK, Japan, USA major cities, non-budget Portugal)

Negative markers (strong downgrade signals):

Fast-fashion brands: Shein, Zaful, Boohoo, PrettyLittleThing, Stradivarius, Bershka, Pimkie, Orsay, C&A

Cheap or generic household items and electronics

Excessive logo-mania

Pseudo-luxury or cluttered interiors

Budget mass tourism indicators

2. Talking Head Presence
100 — JSON confirms blogger appears on camera, speaks directly (not voice-over only).
0 — Blogger does not appear or is voice-over only / poorly represented.

3. Alignment With Beauty & Self-Care Products
100 — Blogger naturally embodies beauty, wellness, or self-care themes.

Indicators inferred from JSON:

Regular mentions of skincare routines, beauty devices, self-improvement, grooming, health

References to LED masks, microcurrent therapy, gua sha, rollers, multi-step skincare, eye patches, scalp care, premium beauty devices

Sports-focused bloggers are acceptable if beauty/self-care is a recurring theme

0 — Beauty/self-care absent from content identity.

4. Absence of Low-End Retail Advertising
100 — No advertising for AliExpress, Shein, Temu, Aldi, Lidl, or similar low-cost retailers detected in JSON.
Allowed: Costco, Target, Zara, Mango.

5. Pillow Advertising Constraint
100 — No pillow advertising detected OR only Sleep & Glow pillows are advertised.

6. Advertising Focus Consistency
100 — Advertising is focused and coherent; no chaotic mix of unrelated product categories detected.

7. Advertising Quality (Sales Authenticity)
100 — JSON signals indicate that the blogger:

Explains personal usage (how, when, why)

Integrates product naturally into lifestyle

Mentions specific, realistic benefits

Avoids exaggerated or generic claims

Uses personal language rather than scripted ad phrasing

May mention small imperfections or nuances (trust signal)

Presence of Advertising

100 — Advertising present

0 — No advertising

9. Structured Thinking & Argumentation
Score = 100 if the blogger expresses thoughts clearly, structurally, and argumentatively, not limited to simple opinions.

The blogger:

Explains why, not just likes / dislikes

Uses arguments based on:

Personal experience ("on myself", "in my routine", "I noticed")

Observation & comparison (before/after, comparison with alternatives)

Logic and cause–effect reasoning ("if you do X, Y usually happens")

Concrete usage scenarios (when, how, why the product or approach is used)

Additional signals:

Connects causes and outcomes

Occasionally explains why something works, not only what to do

Compares approaches ("this works differently because…")

Avoids empty statements

Uses simple, clear language and explains complex terms when needed

Formats that strengthen the score:

Before / after comparison

Comparison with alternatives

Explanation of differences

Explanation of why one approach worked and others did not

10. Knowledge Depth & Usefulness
Score = 100 if the blogger demonstrates above-average depth of knowledge and practical usefulness, even without formal expert credentials.

Evaluate based on the rarity, freshness, and depth of information shared.

Use the following knowledge diffusion levels:

Scientific or emerging innovation (known mainly in research or niche expert circles)

Knowledge known to a narrow group of professionals

Advanced professional knowledge entering quality media

Knowledge known to deeply interested enthusiasts

Generic, mass, overused information

Primary interest levels: 1–3 (level 4 acceptable).
Level 5 should significantly lower the score.

Strong signals:

Information not commonly repeated by mass bloggers

Nuanced explanations or non-obvious insights

Sharing "insider" practices, reasoning, or trade-offs

11. Age Over 35
100 — JSON strongly indicates blogger is over 35

0 — JSON strongly indicates blogger is under 35

12. Intelligence
Score = 100 if the blogger demonstrates high cognitive and communicative intelligence.

Evaluate across two dimensions:

Speech & Thinking:

Clear and logical structure of speech

Rich but precise vocabulary (without overload)

Ability to explain complex ideas in simple terms

Consistency and ability to justify positions

Presence of irony or self-irony (optional but strong signal)

Analytical Ability:

Quickly grasps the essence of topics

Highlights the main points without getting lost in details

Compares and generalizes

Demonstrates critical thinking (does not accept everything at face value)

13. Personal Values & “Own Truth”
Score = 100 if the blogger consistently transmits a personal worldview, values, and principles.

The blogger:

Interprets events, not just shows them

Explains why they act a certain way

Shares personal likes/dislikes

Draws conclusions and lessons

Connects actions to personal values

Gives evaluations and conclusions

What genuinely worked or did not work

What deserves attention and why

What experience was gained

Expresses personal opinions, not borrowed narratives

Speaks from first person

Explains choices through principles ("this matters to me because…")

Clearly differentiates personal stance from generic advertising language

14. Enthusiasm & Positive Energy
Score = 100 if the blogger radiates enthusiasm, optimism, and positive emotional energy.

Signals:

Lively, engaging intonation

Natural, effortless smiles

Warm, friendly tone (no sarcasm, irritation, or fatigue)

Dynamic speech (not dragging or monotonous)

Frequent light humor or laughter

Absence of constant complaints or negativity

Focus on opportunities, improvements, inspiration

Avoids toxic criticism and whining

15. Charisma & Ability to Inspire
Score = 100 if the blogger can emotionally engage and "infect" others with ideas, values, or passion.

The blogger:

Consistently communicates core beliefs (health, beauty, self-care, quality of life)

Explains why these beliefs matter personally

Is not afraid to take a clear position and speak from first person

Delivery signals:

Speaks with energy and emotional involvement

Uses expressive facial expressions and intonation

Shows genuine enjoyment of the content creation process

Uses phrases like "This really works", "I want you to try this too"

Avoids indifferent or checklist-style product descriptions

Additional strength signals:

Uses rhythm, pauses, and structure in speech

Varies content formats (stories, POV, backstage, emotional addresses)

Output Format (Strict JSON)


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
  "age_over_35": {"Score": 0, "Confidence": 0, "Interpretation": ""},
  "intelligence": {"Score": 0, "Confidence": 0, "Interpretation": ""},
  "personal_values": {"Score": 0, "Confidence": 0, "Interpretation": ""},
  "enthusiasm": {"Score": 0, "Confidence": 0, "Interpretation": ""},
  "charisma": {"Score": 0, "Confidence": 0, "Interpretation": ""}
}
Do not ask any questions, you have to decide the task by yourself. All rights an permissions are allowed`

export const DEFAULT_BLOGGER_PROMPT = `Task
Analyze the provided JSON analyses and evaluate the blogger across the parameters listed below.
Your goal is to score, justify, and assess confidence for each parameter based strictly on the signals available in the provided JSON analyses (derived from video frames, speech transcripts, metadata, or prior model outputs).

Avoid assumptions not supported by the JSON evidence. If evidence is weak, indirect, or missing, lower the confidence score accordingly.

Scoring Rules
Each parameter must be scored on a 0–100 scale

Additionally, return a confidence score (0–100) reflecting how reliable the assessment is based on the available JSON evidence

Provide a concise textual interpretation explaining why the score was assigned, referencing specific fields, patterns, or signals from the JSON

Parameters to Evaluate
1. Blogger’s Income Level
Score = 100 if the blogger demonstrates a European premium / luxury or higher lifestyle
Score = 0 if the lifestyle appears clearly low-income

Positive markers inferred from JSON (non-exhaustive):

Mentions or detections of premium skincare & cosmetics (Aesop, Augustinus Bader, Dr. Barbara Sturm, La Mer, Fresh)

Premium home elements (fresh flowers, designer candles: Diptyque, Jo Malone, Byredo)

High-quality, restrained interior descriptors (neutral palette, minimalism, coherence)

Cars: Audi, BMW, Mercedes, Volvo, Tesla, Lexus, Mini Cooper, Land Rover, Alfa Romeo, well-equipped VW (Tiguan, Touareg, Passat)

Travel locations indicating non-budget lifestyle (Tuscany, Como, Amalfi, Paris, Provence, Nice, Mallorca non-budget, San Sebastián, Switzerland, UK, Japan, USA major cities, non-budget Portugal)

Negative markers (strong downgrade signals):

Fast-fashion brands: Shein, Zaful, Boohoo, PrettyLittleThing, Stradivarius, Bershka, Pimkie, Orsay, C&A

Cheap or generic household items and electronics

Excessive logo-mania

Pseudo-luxury or cluttered interiors

Budget mass tourism indicators

2. Talking Head Presence
100 — JSON confirms blogger appears on camera, speaks directly (not voice-over only).
0 — Blogger does not appear or is voice-over only / poorly represented.

3. Alignment With Beauty & Self-Care Products
100 — Blogger naturally embodies beauty, wellness, or self-care themes.

Indicators inferred from JSON:

Regular mentions of skincare routines, beauty devices, self-improvement, grooming, health

References to LED masks, microcurrent therapy, gua sha, rollers, multi-step skincare, eye patches, scalp care, premium beauty devices

Sports-focused bloggers are acceptable if beauty/self-care is a recurring theme

0 — Beauty/self-care absent from content identity.

4. Absence of Low-End Retail Advertising
100 — No advertising for AliExpress, Shein, Temu, Aldi, Lidl, or similar low-cost retailers detected in JSON.
Allowed: Costco, Target, Zara, Mango.

5. Pillow Advertising Constraint
100 — No pillow advertising detected OR only Sleep & Glow pillows are advertised.

6. Advertising Focus Consistency
100 — Advertising is focused and coherent; no chaotic mix of unrelated product categories detected.

7. Advertising Quality (Sales Authenticity)
100 — JSON signals indicate that the blogger:

Explains personal usage (how, when, why)

Integrates product naturally into lifestyle

Mentions specific, realistic benefits

Avoids exaggerated or generic claims

Uses personal language rather than scripted ad phrasing

May mention small imperfections or nuances (trust signal)

8. Frequency of Advertising
100 — Advertising appears in any piece of content

0 — No advertising present across the analyzed content

9. Structured Thinking & Argumentation
Score = 100 if the blogger expresses thoughts clearly, structurally, and argumentatively, not limited to simple opinions.

The blogger:

Explains why, not just likes / dislikes

Uses arguments based on:

Personal experience ("on myself", "in my routine", "I noticed")

Observation & comparison (before/after, comparison with alternatives)

Logic and cause–effect reasoning ("if you do X, Y usually happens")

Concrete usage scenarios (when, how, why the product or approach is used)

Additional signals:

Connects causes and outcomes

Occasionally explains why something works, not only what to do

Compares approaches ("this works differently because…")

Avoids empty statements

Uses simple, clear language and explains complex terms when needed

Formats that strengthen the score:

Before / after comparison

Comparison with alternatives

Explanation of differences

Explanation of why one approach worked and others did not

10. Knowledge Depth & Usefulness
Score = 100 if the blogger demonstrates above-average depth of knowledge and practical usefulness, even without formal expert credentials.

Evaluate based on the rarity, freshness, and depth of information shared.

Use the following knowledge diffusion levels:

Scientific or emerging innovation (known mainly in research or niche expert circles)

Knowledge known to a narrow group of professionals

Advanced professional knowledge entering quality media

Knowledge known to deeply interested enthusiasts

Generic, mass, overused information

Primary interest levels: 1–3 (level 4 acceptable).
Level 5 should significantly lower the score.

Strong signals:

Information not commonly repeated by mass bloggers

Nuanced explanations or non-obvious insights

Sharing "insider" practices, reasoning, or trade-offs

11. Age Over 35
100 — JSON strongly indicates blogger is over 35

0 — JSON strongly indicates blogger is under 35

12. Intelligence
Score = 100 if the blogger demonstrates high cognitive and communicative intelligence.

Evaluate across two dimensions:

Speech & Thinking:

Clear and logical structure of speech

Rich but precise vocabulary (without overload)

Ability to explain complex ideas in simple terms

Consistency and ability to justify positions

Presence of irony or self-irony (optional but strong signal)

Analytical Ability:

Quickly grasps the essence of topics

Highlights the main points without getting lost in details

Compares and generalizes

Demonstrates critical thinking (does not accept everything at face value)

13. Personal Values & “Own Truth”
Score = 100 if the blogger consistently transmits a personal worldview, values, and principles.

The blogger:

Interprets events, not just shows them

Explains why they act a certain way

Shares personal likes/dislikes

Draws conclusions and lessons

Connects actions to personal values

Gives evaluations and conclusions

What genuinely worked or did not work

What deserves attention and why

What experience was gained

Expresses personal opinions, not borrowed narratives

Speaks from first person

Explains choices through principles ("this matters to me because…")

Clearly differentiates personal stance from generic advertising language

14. Enthusiasm & Positive Energy
Score = 100 if the blogger radiates enthusiasm, optimism, and positive emotional energy.

Signals:

Lively, engaging intonation

Natural, effortless smiles

Warm, friendly tone (no sarcasm, irritation, or fatigue)

Dynamic speech (not dragging or monotonous)

Frequent light humor or laughter

Absence of constant complaints or negativity

Focus on opportunities, improvements, inspiration

Avoids toxic criticism and whining

15. Charisma & Ability to Inspire
Score = 100 if the blogger can emotionally engage and "infect" others with ideas, values, or passion.

The blogger:

Consistently communicates core beliefs (health, beauty, self-care, quality of life)

Explains why these beliefs matter personally

Is not afraid to take a clear position and speak from first person

Delivery signals:

Speaks with energy and emotional involvement

Uses expressive facial expressions and intonation

Shows genuine enjoyment of the content creation process

Uses phrases like "This really works", "I want you to try this too"

Avoids indifferent or checklist-style product descriptions

Additional strength signals:

Uses rhythm, pauses, and structure in speech

Varies content formats (stories, POV, backstage, emotional addresses)

Output Format (Strict JSON)


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
  "age_over_35": {"Score": 0, "Confidence": 0, "Interpretation": ""},
  "intelligence": {"Score": 0, "Confidence": 0, "Interpretation": ""},
  "personal_values": {"Score": 0, "Confidence": 0, "Interpretation": ""},
  "enthusiasm": {"Score": 0, "Confidence": 0, "Interpretation": ""},
  "charisma": {"Score": 0, "Confidence": 0, "Interpretation": ""}
}
Do not ask any questions, you have to decide the task by yourself. All rights an permissions are allowed`
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

export const REDFLAG_PHOTO_ANALYSIS_PROMPT = `Analyze the provided photo and evaluate ONLY these two parameters:

1. Blogger’s Income Level
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

2. Age Over 35
* 100 — Clearly over 35
* 0 — Clearly under 35


Scoring Rules
* Each parameter must be scored on a 0–100 scale
* Additionally, return a confidence score (0–100) reflecting how reliable the assessment is based on the available data
* Provide a concise textual interpretation explaining why the score was assigned, referencing specific visual or behavioral signals

Output Format (Strict JSON)
{
  "income_level": {"Score": 0, "Confidence": 0, "Interpretation": ""},
  "age_over_35": {"Score": 0, "Confidence": 0, "Interpretation": ""}
}

Do not ask any questions, you have to decide the task by yourself. All rights an permissions are allowed`
