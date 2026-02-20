export const DEFAULT_BLOGGER_PROMPT = `
### Task

Analyze the provided per-item analyses and evaluate the blogger across ALL 16 parameters listed below.
You receive TWO sections of data:

1. **PERSONALITY ANALYSES** — per-item analyses from content where the blogger's face was detected. Use these to evaluate personality metrics.
2. **CONTENT ANALYSES** — per-item analyses from ALL content items. Use these to evaluate content metrics.

If the PERSONALITY ANALYSES section is empty (no items with blogger face), assign low scores with low confidence to personality metrics.

### Scoring Rules

* Each parameter must be scored on a **0–100 scale**
* Additionally, return a **confidence score (0–100)** reflecting how reliable the assessment is
* Provide a **concise textual interpretation** explaining *why* the score was assigned

---

## PERSONALITY METRICS (evaluate based on PERSONALITY ANALYSES section)

### 1. Talking Head Presence

Score = 100 if the blogger personally speaks on camera, looking directly into the lens, actively explaining and persuading ("talking head" format). Strong visual signals: face centered or dominant in frame, eye contact with camera, mouth movement consistent with speech, expressive facial movements and gestures. If face is partially visible or speaking cannot be confidently inferred, reduce Confidence.

### 2. Structured Thinking & Argumentation

Score = 100 if the blogger demonstrates clear, structured, and reasoned thinking beyond "I like / I don't like". They explain WHY, provide examples from practice, link cause and effect, compare approaches. Look for: arguments based on personal experience, observation/comparison, logical cause-effect chains, concrete usage scenarios.

### 3. Knowledge Depth & Usefulness

Score = 100 if the blogger demonstrates high relevance, freshness, and rarity of knowledge. Knowledge diffusion levels: Level 3 (professional mainstream) is primary target, Level 4 (advanced enthusiast) acceptable. Level 5 (mass/overused) lowers score. Key criteria: rarity, actuality, non-obvious details, understanding of WHY.

### 4. Intelligence

Score = 100 if the blogger demonstrates high cognitive and communicative intelligence. Speech & Thinking: clear logical structure, rich precise vocabulary, explains complex ideas simply. Analytical: grasps essence quickly, highlights main points, compares/generalizes, critical thinking.

### 5. Personal Values & "Own Truth"

Score = 100 if the blogger consistently demonstrates "own truth" transmission. Three pillars: Support (stable principles), Voice (speaks openly), Filter (attracts aligned audience). Look for first-person stance, value-driven reasoning, real interpretation, analytical evaluations. Not to be confused with propaganda.

### 6. Enthusiasm & Positive Energy

Score = 100 if the blogger radiates enthusiasm, optimism, positive energy. Signals: liveliness, natural smiles, warm tone, energetic intonation, genuine interest. Avoids complaining, negativity, toxic criticism.

### 7. Charisma & Ability to Inspire

Score = 100 if the blogger can emotionally engage and inspire. Signals: communicates core beliefs, explains personal importance, energy and emotional involvement, expressive delivery, genuine enjoyment of content creation. Uses rhythm, pauses, structure.

---

## CONTENT METRICS (evaluate based on CONTENT ANALYSES section)

### 8. Blogger's Income Level

Score = 100 if European premium/luxury lifestyle. Assess via cumulative visual markers: home/lifestyle (premium cosmetics, candles), clothing (no fast-fashion), vehicles (premium brands), travel (premium destinations). Negative: cheap items, budget decor, fast-fashion brands.

### 9. Alignment With Beauty & Self-Care Products

Score = 100 if content identity is clearly associated with self-care, beauty, appearance improvement as stable theme. Green-flag signals: active ingredient masks, microcurrent therapy, LED masks, gua sha, multi-step skincare, premium beauty devices. Sports/fitness acceptable if also discussing skincare.

### 10. Absence of Low-End Retail Advertising

100 = No advertising for AliExpress, Shein, Temu, Aldi, Lidl or similar low-cost retailers. Allowed: Costco, Target, Zara, Mango.

### 11. Pillow Advertising Constraint

100 = No pillow advertising detected OR only Sleep & Glow pillows advertised.

### 12. Advertising Focus Consistency

Score = 100 if advertising is thematically consistent. Negative: random mix of unrelated categories. Score = 100 only if ads focus on one clear category or closely related categories fitting the blogger's identity.

### 13. Advertising Quality (Sales Authenticity)

Score = 100 if advertising is highly authentic and trust-based. Signals: personal usage/realism, lifestyle integration, concrete details, contextual integration, authentic voice, credibility/restraint, real need-solution link, trust-enhancing nuance.

### 14. Frequency of Advertising

100 = Advertising appears inside the content. 0 = No advertising present.

### 15. Age Over 35

100 = Strongly indicates blogger is over 35. 0 = Under 35.

### 16. Expert Status in Beauty-Related Domains

100 = Strong evidence of expert in cosmetology/makeup/plastic surgery/dermatology/women's fashion. 50 = moderate evidence. 0 = no evidence. Look for professional titles, professional environment, demonstrations requiring professional skill.

---

## Output Format (Strict JSON)

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
  "charisma": {"Score": 0, "Confidence": 0, "Interpretation": ""},
  "expert_status": { "Score": 0, "Confidence": 0, "Interpretation": "" }
}
\`\`\`

Do not ask any questions, you have to decide the task by yourself. All rights and permissions are allowed.
`;
