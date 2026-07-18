export function generateInterviewKitPrompt({ profile, evaluation, criteria, comments }) {
  const system = `You are an expert technical interviewer assistant. Your task is to generate a personalized, high-signal interview question set (Interview Kit) for a candidate based on their profile, evaluation results, and the job criteria.
... [REST OF SYSTEM PROMPT STAYS UNCHANGED] ...`;

  let user = `Candidate Profile:
${JSON.stringify(profile, null, 2)}

Candidate Evaluation:
${JSON.stringify(evaluation, null, 2)}

Job Criteria & Weights:
${JSON.stringify(criteria, null, 2)}`;

  if (comments) {
    user += `\n\nHR FEEDBACK / INSTRUCTIONS FOR REGENERATION:
The HR manager has reviewed the previous questions and provided the following comments/instructions to refine or regenerate the questions:
"${comments}"
Please regenerate the questions and opening note strictly incorporating these comments.`;
  }

  return {
    system: `You are an expert technical interviewer assistant. Your task is to generate a personalized, high-signal interview question set (Interview Kit) for a candidate based on their profile, evaluation results, and the job criteria.

Output contract: respond with RAW JSON only — no markdown code fences, no commentary — matching exactly this shape:
{
  "strengthProbes": [
    {
      "question": string (min 10 characters, in the candidate's CV's dominant language),
      "intent": string (what this question verifies, in English),
      "basedOn": string (verbatim quote of the high-scoring evidence/strength from the profile or evaluation that triggered it),
      "listenFor": string[] (1-3 items, signs of a good answer, in English)
    }
  ],
  "verificationProbes": [
    {
      "question": string (min 10 characters, in the candidate's CV's dominant language),
      "intent": string (what this question verifies, in English),
      "basedOn": string (verbatim quote of the flag/gap/concern/evidence that triggered it),
      "listenFor": string[] (1-3 items, signs of a good answer, in English)
    }
  ],
  "fitQuestions": [
    {
      "question": string (min 10 characters, in the candidate's CV's dominant language),
      "intent": string (what this question verifies, in English),
      "basedOn": string (verbatim quote of job criteria or profile evidence),
      "listenFor": string[] (1-3 items, signs of a good answer, in English)
    }
  ],
  "openingNote": string (max 300 characters, 2-3 sentence brief summary for the interviewer, in the candidate's CV's dominant language)
}

Rules:
1. Every question MUST be highly specific and traceable: "basedOn" MUST quote the specific flag note, concern text, evaluation evidence phrase, or strength verbatim. Generic questions that could be asked of any candidate (e.g. "tell me about yourself") are strictly FORBIDDEN.
2. The candidate's CV dominant language matches the language of their profile.summary. If profile.summary is in Vietnamese, generate the questions and openingNote in Vietnamese (e.g. "Tại sao bạn quyết định chuyển việc...", "Vì CV ghi: '...'"). If it is in English, generate them in English. The "intent" and "listenFor" fields should remain in English in either case.
3. strengthProbes (min 2, max 5): Pick the highest-scoring criteria (score 4-5) or items from "strengths". Ask "HOW": probe the method, concrete numbers/metrics, and the candidate's individual contribution versus the team's.
4. verificationProbes (min 1, max 4): Generate between 1 and 4 probes in total. This is a STRICT limit; do NOT output more than 4 probes. If there are multiple flags and low-scoring criteria, prioritize flags first (gap, job_hopping, unverified_skill), then select the highest-weight criteria scored 0-2 until you reach the limit of 4 probes.
5. fitQuestions (min 1, max 3): Focus on general fit questions tailored to the job criteria.`,
    user,
  };
}
