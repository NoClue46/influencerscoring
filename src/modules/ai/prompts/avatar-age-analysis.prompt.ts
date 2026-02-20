// TODO(dead-code): currently unused in runtime pipeline; kept for future avatar age checks.
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
