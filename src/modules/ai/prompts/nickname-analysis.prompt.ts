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

