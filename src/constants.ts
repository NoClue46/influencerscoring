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

export const DEFAULT_POST_PROMPT = `Based on video frames, score the data by next parameters

1. Blogger’s income level
2. Whether the blogger is over 30 years old
3. Depth of knowledge / usefulness
4. Blogger’s intelligence
5. What is being advertised and how often
6. Whether it is a talking-head video or not

Return two numbers for each parameter:

1. Parameter score on a 100-point scale
2. Confidence in the accuracy of this parameter’s score on a 100-point scale

For each parameter also describe in text form the interpretation of the accepted assessment with the theses on which it was based.

Output as a JSON object with this structure:

{
  "income_level": [”Score:” score, “Confidence:”confidence, “Interpretation”: interpretation],
  "age_over_30":  [”Score:” score, “Confidence:”confidence, “Interpretation”: interpretation],
  "knowledge_depth":  [”Score:” score, “Confidence:”confidence, “Interpretation”: interpretation],
  "intelligence":  [”Score:” score, “Confidence:”confidence, “Interpretation”: interpretation],
  "advertising_intensity":  [”Score:” score, “Confidence:”confidence, “Interpretation”: interpretation],
  "talking_head":  [”Score:” score, “Confidence:”confidence, “Interpretation”: interpretation],
}`

export const DEFAULT_BLOGGER_PROMPT = `Based on video frames, score the data by next parameters

1. Blogger’s income level

1. Whether the blogger is over 30 years old
2. Depth of knowledge / usefulness
3. Blogger’s intelligence
4. What is being advertised and how often
5. Whether it is a talking-head video or not

Return two numbers for each parameter:

1. Parameter score on a 100-point scale
2. Confidence in the accuracy of this parameter’s score on a 100-point scale

For each parameter also describe in text form the interpretation of the accepted assessment with the theses on which it was based.

Output as a JSON object with this structure:

{
  "income_level": [”Score:” score, “Confidence:”confidence, “Interpretation”: interpretation],
  "age_over_30": [”Score:” score, “Confidence:”confidence, “Interpretation”: interpretation],
  "knowledge_depth": [”Score:” score, “Confidence:”confidence, “Interpretation”: interpretation],
  "intelligence":  [”Score:” score, “Confidence:”confidence, “Interpretation”: interpretation],
  "advertising_intensity":  [”Score:” score, “Confidence:”confidence, “Interpretation”: interpretation],
  "talking_head":  [”Score:” score, “Confidence:”confidence, “Interpretation”: interpretation],
}`