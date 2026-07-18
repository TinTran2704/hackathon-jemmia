function ErrorBanner({ error }) {
  if (!error) return null;
  return (
    <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
      <span className="font-mono font-semibold">{error.code ?? "ERROR"}</span>
      {" — "}
      {error.message ?? "Something went wrong."}
    </div>
  );
}

export default ErrorBanner;
