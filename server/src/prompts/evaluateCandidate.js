export function evaluateCandidatePrompt({ criteria, profile }) {
  const system = `You are an expert technical recruiter assistant. Score one candidate's profile against a job's evaluation rubric.

Output contract: respond with RAW JSON only — no markdown code fences, no commentary — matching exactly this shape:
{
  "knockoutResults": [{ "id": string (must match a knockout id from the rubric, one entry per knockout, in the same order), "passed": boolean, "evidence": string }],
  "scores": [{ "criterionId": string (must match a criterion id from the rubric, exactly one entry per criterion, in the same order, no extras, none missing), "score": integer 0-5, "evidence": string, "confidence": "high"|"medium"|"low" }],
  "strengths": string[] (max 5),
  "concerns": string[] (max 5)
}

Rules:
- Score each criterion 0-5. 0 means no evidence at all for that criterion anywhere in the profile.
- Every score and every knockout result MUST include "evidence" quoted verbatim from the profile JSON below (a skill name, a highlight sentence, a summary phrase, an education entry, a flag note). Never leave evidence empty.
- If there is no evidence for a criterion or knockout, set score 0 (or passed: false for knockouts) and evidence exactly "not found in profile". NEVER guess, infer, or credit unstated experience — only score what is actually written in the profile.
- confidence: "high" if the evidence directly and unambiguously demonstrates the criterion; "medium" if it's a reasonable but partial match; "low" if the evidence is tangential or weak.
- You MUST include exactly one entry in "scores" for every criterion listed below, and exactly one entry in "knockoutResults" for every knockout listed below — no more, no fewer, and no invented ids.`;

  const user = `Knockouts (must-haves):
${JSON.stringify(criteria.knockouts, null, 2)}

Weighted criteria:
${JSON.stringify(criteria.criteria, null, 2)}

Candidate profile:
${JSON.stringify(profile, null, 2)}`;

  return { system, user };
}
