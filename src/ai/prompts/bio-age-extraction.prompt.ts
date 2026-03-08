import { z } from 'zod';

export const bioAgeExtractionSchema = z.object({
    age: z.number().nullable().describe('Extracted age or null if not found'),
});

export const BIO_AGE_EXTRACTION_PROMPT = (biography: string, currentYear: number) => `
Extract the person's age from this Instagram bio text. Look for:
- Direct age mentions: "28 лет", "25 y.o.", "age 30", "мне 32"
- Birth year: "1995 г.р.", "Born in 1998", "2001", "95'"
- Emoji patterns with numbers that indicate age

Current year: ${currentYear}. If you find a birth year, calculate age as ${currentYear} - birth_year.

Return age as a number, or null if no age information is found. Do NOT guess — only extract if clearly stated.

Bio text:
"${biography}"
`;
