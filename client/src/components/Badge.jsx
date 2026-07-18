const COLORS = {
  strong_match: "bg-green-100 text-green-800 border-green-300",
  match: "bg-blue-100 text-blue-800 border-blue-300",
  weak_match: "bg-amber-100 text-amber-800 border-amber-300",
  reject_review: "bg-red-100 text-red-800 border-red-300",
};

const LABELS = {
  strong_match: "Strong match",
  match: "Match",
  weak_match: "Weak match",
  reject_review: "Reject / review",
};

function RecommendationBadge({ recommendation }) {
  const classes = COLORS[recommendation] ?? "bg-slate-100 text-slate-700 border-slate-300";
  return (
    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${classes}`}>
      {LABELS[recommendation] ?? recommendation}
    </span>
  );
}

export default RecommendationBadge;
