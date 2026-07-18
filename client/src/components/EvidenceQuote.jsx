function EvidenceQuote({ children }) {
  return (
    <blockquote className="mt-1 border-l-4 border-slate-300 bg-slate-50 pl-3 py-1.5 text-sm italic text-slate-700">
      “{children}”
    </blockquote>
  );
}

export default EvidenceQuote;
