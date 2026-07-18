// Pure scoring math — the LLM only ever judges individual criteria;
// everything here is deterministic so HR can trust and later tweak it
// without re-calling the LLM.

// total = sum(score_i * weight_i) / sum(5 * weight_i) * 100, rounded to 1 decimal.
// A 'low' confidence score is dampened by 0.7 before weighting — we trust
// weak evidence less, so it should pull the total down even at score 5.
export function computeTotal(scores, criteria) {
  let numerator = 0;
  let denominator = 0;

  for (const criterion of criteria) {
    const match = scores.find((s) => s.criterionId === criterion.id);
    if (!match) continue;
    const effectiveScore = match.confidence === "low" ? match.score * 0.7 : match.score;
    numerator += effectiveScore * criterion.weight;
    denominator += 5 * criterion.weight;
  }

  if (denominator === 0) return 0;
  return Math.round((numerator / denominator) * 100 * 10) / 10;
}

export function computeRecommendation({ total, knockoutFailed }) {
  if (knockoutFailed) return "reject_review";
  if (total >= 75) return "strong_match";
  if (total >= 55) return "match";
  return "weak_match";
}
