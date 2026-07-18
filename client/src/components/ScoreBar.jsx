import EvidenceQuote from "./EvidenceQuote.jsx";

function ScoreBar({ label, weight, score, confidence, evidence }) {
  const pct = (score / 5) * 100;
  const barColor = score >= 4 ? "bg-green-500" : score >= 2 ? "bg-amber-500" : "bg-red-400";

  return (
    <div className="py-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-slate-800">{label}</span>
        <span className="text-xs text-slate-500">
          weight {weight} · {score}/5 · {confidence} confidence
        </span>
      </div>
      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <div className={`h-full ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <EvidenceQuote>{evidence}</EvidenceQuote>
    </div>
  );
}

export default ScoreBar;
