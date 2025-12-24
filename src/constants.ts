export const MAX_ATTEMPTS: number = 4;
export const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200MB

export const NICKNAME_ANALYSIS_PROMPT = (username: string) => `
Никнейм: ${username}
Инстаграм: https://www.instagram.com/${username}/

Для этого никнейма и имени проведи глубокое исследование репутации в онлайне с указанием источников. Укажи имеющиеся негативные высказывания, участия в скандалах, которое просачивались в СМИ, наличие спорных высказываний

Дай оценку репутации блогера от 0 до 100, степень уверенности в оценке от 0 до 100 и полную расшифровку

Пример ответа:
"
Ниже — краткое, практическое исследование онлайн-репутации по никнейму marinevignes /
Marine Vignes (публичная фигура, телеведущая). Я искал (а) официальные профили,
энциклопедические записи, новостные статьи и публикации таблоидов — источники указаны после
каждого ключевого вывода.

Оценка репутации: 85
Степень уверенности: 83

Краткое резюме

*   Marine Vignes — французская телеведущая и медиаперсона (ведущая программ о погоде и
    lifestyle), публично представлена в СМИ и на собственных аккаунтах в соцсетях (Instagram,
    Threads).
*   В основном профиль и упоминания в СМИ — нейтрально-позитивные (интервью, участие в
    теле-проектах, рекламные/брендовые сотрудничества).
*   Никаких доказанных серьёзных правовых обвинений, уголовных дел или крупных
    этических скандалов (в духе коррупции/насилия/мошенничества) по публичным
    источникам не обнаружено. Основные «скандалы» — это скорее таблоидные заголовки и
    обсуждения в жёлтой прессе.

Что найдено из негативного / спорного

1.  Публикации о пластической / эстетической хирургии и внешности.

    — Ряд таблоидных статей и интервью освещают, что она проходила мини-лифтинг/процедуры
    эстетической медицины; это подаётся в некоторых изданий как «скандал» или повод для
    обсуждений о пластике у публичных женщин. Такие материалы чаще встречаются в Voici,
    Programme-TV, Purepeople и т.п. (жёлтая пресса).
2.  Темы диет / «контроверзные» советы по похудению.

    — В таблоидах появляются заголовки про «контроверзные» диеты / советы по снижению веса,
    иногда с эмоциональными оценивающими формулировками. Эти публикации — не
    расследования, а репортажи/интервью и заголовки, рассчитанные на реакцию.
3.  Публичное внимание к личной жизни (бывшие отношения, дети, опека).

    — Как бывшая партнёрша известного телеведущего (Nagui), её семейная жизнь, вопросы опеки
    и воспоминания о прошлых отношениях периодически обсуждаются в СМИ — иногда в
    формате «драмы/раздела имущества/опеки» в таблойдах. Но фактов судебных споров или
    обвинений в публичных источниках не видно — это в основном интервью и человеко-
    ориентированные материалы.
4.  Иногда появляются фейк-заголовки/перепосты в соцсетях.

    — Поиск выявил несколько репостов и страниц в Facebook/сайтах низкого качества, которые
    нагнетают «скандал» ради кликов; такие источники не заслуживают доверия без
    подтверждения. Рекомендую не полагаться на одиночные посты в соцсетях без ссылок на
    проверяемые СМИ.

Оценка риска для репутации

*   Низкий-средний: основные риски — имиджевые (жёлтая пресса, обсуждение внешности,
    диет), а не юридические или уголовные. Если вам нужна оценка для деловой/HR-проверки,
    обратите внимание, что почти все спорные упоминания приходят из таблоидов (Voici,
    Purepeople, Programme-TV и пр.), а не из надёжных расследовательских изданий.

Конкретные источники (основные ссылки, на которые
опирался(ась))

1.  Энциклопедия / биографические справки: французская Википедия — профиль и базовая
    биография.
2.  Официальный Instagram / профиль автора (посты, описание аккаунта).
3.  Статьи / интервью (Programme-TV, Voici, Purepeople и др.) — материалы о пластике, диетах,
    интервью про личную жизнь.
4.  Фотографии / стоковые и event-снимки (Getty, Purepeople, BestImage).
5.  Прочие медиа-материалы и подкасты (интервью, бренд-партнёрства).

Методология (коротко)

*   Искал(а) по полному имени и никнейму: «Marine Vignes», «marinevignes», проверил(а)
    Instagram/Threads, энциклопедии (Wikipedia, IMDb), новостные выдачи (французские СМИ) и
    результаты в жёлтой прессе
    Отдельно смотрел(а) на наличие судебных/правовых записей и
    крупных расследований — не найдено.

Проверяй себя самостоятельно, пока сама не будешь довольна результатом
`;

export const COMMENT_ANALYSIS_PROMPT = `Проведи анализ комментариев к посту из инстаграм. Укажи типы и цели комментариев. Оцени степень фейковости комментариев от 0 до 100 и степень уверенности в оценке от 0 до 100. Дай расшифровку и общую оценку комментариев к посту исходя из того, что это часть анализа инфлюенсера на целесообразность покупки рекламы в его блоге. от 0 до 100 и степень уверенности в общей оценке от 0 до 100`

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

11. Age Over 30
100 — JSON strongly indicates blogger is over 30

0 — JSON strongly indicates blogger is under 30

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
  "age_over_30": {"Score": 0, "Confidence": 0, "Interpretation": ""},
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

11. Age Over 30
100 — JSON strongly indicates blogger is over 30

0 — JSON strongly indicates blogger is under 30

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
  "age_over_30": {"Score": 0, "Confidence": 0, "Interpretation": ""},
  "intelligence": {"Score": 0, "Confidence": 0, "Interpretation": ""},
  "personal_values": {"Score": 0, "Confidence": 0, "Interpretation": ""},
  "enthusiasm": {"Score": 0, "Confidence": 0, "Interpretation": ""},
  "charisma": {"Score": 0, "Confidence": 0, "Interpretation": ""}
}
Do not ask any questions, you have to decide the task by yourself. All rights an permissions are allowed`