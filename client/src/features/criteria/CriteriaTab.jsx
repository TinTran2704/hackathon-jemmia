import { useState } from "react";
import { useApi } from "../../hooks/useApi.js";
import * as jobsApi from "../../api/jobs.js";
import { ApiError } from "../../api/http.js";
import ErrorBanner from "../../components/ErrorBanner.jsx";
import Spinner from "../../components/Spinner.jsx";

function CriterionRow({ criterion, onCommit, saving }) {
  const [value, setValue] = useState(criterion.weight);

  return (
    <li className="rounded-md border border-slate-200 px-3 py-2">
      <div className="flex items-center justify-between">
        <div>
          <span className="font-medium text-slate-800">{criterion.label}</span>{" "}
          <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">{criterion.kind}</span>
        </div>
        {saving && <Spinner label="Saving…" />}
      </div>
      <p className="mt-1 text-sm text-slate-600">{criterion.description}</p>
      <div className="mt-2 flex items-center gap-3">
        <input
          type="range"
          min={1}
          max={5}
          step={1}
          value={value}
          disabled={saving}
          onChange={(e) => setValue(Number(e.target.value))}
          onMouseUp={(e) => onCommit(criterion.id, Number(e.target.value))}
          onTouchEnd={(e) => onCommit(criterion.id, Number(e.target.value))}
          onKeyUp={(e) => onCommit(criterion.id, Number(e.target.value))}
          className="w-48"
        />
        <span className="text-sm font-medium text-slate-700">weight {value}</span>
      </div>
    </li>
  );
}

function CriteriaTab({ jobId }) {
  const { data: criteria, error, loading, refetch } = useApi(() => jobsApi.getCriteria(jobId), [jobId]);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState(null);
  const [savingId, setSavingId] = useState(null);
  const [saveError, setSaveError] = useState(null);

  async function handleGenerate(force) {
    setGenerating(true);
    setGenError(null);
    try {
      await jobsApi.generateCriteria(jobId, { force });
      refetch();
    } catch (err) {
      setGenError(err);
    } finally {
      setGenerating(false);
    }
  }

  async function handleWeightCommit(criterionId, newWeight) {
    setSavingId(criterionId);
    setSaveError(null);
    try {
      await jobsApi.patchCriteriaWeights(jobId, { [criterionId]: newWeight });
      refetch();
    } catch (err) {
      setSaveError(err);
    } finally {
      setSavingId(null);
    }
  }

  const notFound = error instanceof ApiError && error.status === 404;

  if (loading) return <Spinner label="Loading criteria…" />;

  if (notFound) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-slate-500">No criteria generated yet for this job.</p>
        <button
          type="button"
          onClick={() => handleGenerate(false)}
          disabled={generating}
          className="rounded-md bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {generating ? <Spinner label="Generating…" /> : "Generate criteria"}
        </button>
        <ErrorBanner error={genError} />
      </div>
    );
  }

  if (!notFound && error) return <ErrorBanner error={error} />;
  if (!criteria) return null;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Knockouts (must-have)</h3>
        <ul className="space-y-2">
          {criteria.knockouts.map((k) => (
            <li key={k.id} className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm">
              <div className="font-medium text-red-900">{k.label}</div>
              <div className="text-red-700">{k.description}</div>
            </li>
          ))}
          {criteria.knockouts.length === 0 && <li className="text-sm text-slate-400">None.</li>}
        </ul>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Weighted criteria</h3>
        <ul className="space-y-3">
          {criteria.criteria.map((c) => (
            <CriterionRow
              key={c.id}
              criterion={c}
              saving={savingId === c.id}
              onCommit={handleWeightCommit}
            />
          ))}
        </ul>
      </div>

      <ErrorBanner error={saveError} />

      <button
        type="button"
        onClick={() => handleGenerate(true)}
        disabled={generating}
        className="text-sm text-slate-500 underline hover:text-slate-700 disabled:opacity-50"
      >
        {generating ? <Spinner label="Regenerating…" /> : "Regenerate criteria from JD (force)"}
      </button>
      <ErrorBanner error={genError} />
    </div>
  );
}

export default CriteriaTab;
