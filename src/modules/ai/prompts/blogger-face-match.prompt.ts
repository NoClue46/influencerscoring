export const BLOGGER_FACE_MATCH_PROMPT = `You are given two images:
1) Reference avatar photo of a blogger
2) Candidate content image

Task:
Decide whether the person in image #2 is the same person as in image #1.

Return strict JSON only:
{
  "same_person": true,
  "confidence": 0
}

Rules:
- "same_person" must be boolean.
- "confidence" must be an integer from 0 to 100.
- Be conservative. If identity is unclear, set "same_person": false.
- Consider face visibility, angle, lighting, occlusion, and image quality.
- Output only JSON, no markdown and no extra text.`;
