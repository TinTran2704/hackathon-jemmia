function Spinner({ label }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-slate-500">
      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
      {label}
    </span>
  );
}

export default Spinner;
