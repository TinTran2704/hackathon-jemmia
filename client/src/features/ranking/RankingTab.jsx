import { useState } from "react";
import { useApi } from "../../hooks/useApi.js";
import * as jobsApi from "../../api/jobs.js";
import * as candidatesApi from "../../api/candidates.js";
import Badge from "../../components/Badge.jsx";
import ErrorBanner from "../../components/ErrorBanner.jsx";
import Spinner from "../../components/Spinner.jsx";
import ScoreBar from "../../components/ScoreBar.jsx";
import EvidenceQuote from "../../components/EvidenceQuote.jsx";

function ExpandedCandidate({ jobId, candidateId, criteria }) {
  const { data: evaluation, error, loading } = useApi(
    () => candidatesApi.getEvaluation(jobId, candidateId),
    [jobId, candidateId]
  );

  if (loading) {
    return (
      <div className="border-t border-slate-100 px-4 py-3">
        <Spinner label="Loading evidence…" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="border-t border-slate-100 px-4 py-3">
        <ErrorBanner error={error} />
      </div>
    );
  }
  if (!evaluation) return null;

  const criterionById = new Map((criteria?.criteria ?? []).map((c) => [c.id, c]));
  const knockoutById = new Map((criteria?.knockouts ?? []).map((k) => [k.id, k]));

  return (
    <div className="space-y-4 border-t border-slate-100 px-4 py-4">
      <div>
        <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Knockouts</h4>
        <ul className="space-y-2">
          {evaluation.knockoutResults.map((k) => (
            <li key={k.id} className="text-sm">
              <span className={k.passed ? "text-green-700" : "text-red-700"}>
                {k.passed ? "✓" : "✗"} {knockoutById.get(k.id)?.label ?? k.id}
              </span>
              <EvidenceQuote>{k.evidence}</EvidenceQuote>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Criteria scores</h4>
        {evaluation.scores.map((s) => {
          const criterion = criterionById.get(s.criterionId);
          return (
            <ScoreBar
              key={s.criterionId}
              label={criterion?.label ?? s.criterionId}
              weight={criterion?.weight ?? "?"}
              score={s.score}
              confidence={s.confidence}
              evidence={s.evidence}
            />
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Strengths</h4>
          <ul className="list-inside list-disc text-sm text-slate-700">
            {evaluation.strengths.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Concerns</h4>
          <ul className="list-inside list-disc text-sm text-slate-700">
            {evaluation.concerns.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function RankingTab({ jobId }) {
  const { data: ranking, error, loading, refetch } = useApi(() => jobsApi.getRanking(jobId), [jobId]);
  const { data: criteria } = useApi(() => jobsApi.getCriteria(jobId).catch(() => null), [jobId]);
  const [expandedId, setExpandedId] = useState(null);
  const [rescoring, setRescoring] = useState(false);
  const [rescoreError, setRescoreError] = useState(null);
  const [pendingGenId, setPendingGenId] = useState(null);
  const [pendingGenError, setPendingGenError] = useState(null);

  const anyStale = ranking?.ranked.some((c) => c.stale);

  async function handleRescore() {
    setRescoring(true);
    setRescoreError(null);
    try {
      await jobsApi.rescore(jobId);
      refetch();
    } catch (err) {
      setRescoreError(err);
    } finally {
      setRescoring(false);
    }
  }

  async function handleGeneratePending(candidateId, reason) {
    setPendingGenId(candidateId);
    setPendingGenError(null);
    try {
      if (reason === "no_profile") {
        await candidatesApi.generateProfile(jobId, candidateId);
      }
      await candidatesApi.generateEvaluation(jobId, candidateId);
      refetch();
    } catch (err) {
      setPendingGenError(err);
    } finally {
      setPendingGenId(null);
    }
  }

  if (loading) return <Spinner label="Loading ranking…" />;
  if (error) return <ErrorBanner error={error} />;
  if (!ranking) return null;

  return (
    <div className="space-y-4">
      {anyStale && (
        <div className="flex items-center justify-between rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <span>Some evaluations are stale (criteria changed since they were scored).</span>
          <button
            type="button"
            onClick={handleRescore}
            disabled={rescoring}
            className="rounded-md bg-amber-600 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
          >
            {rescoring ? <Spinner label="Re-scoring…" /> : "Re-score all (instant, no LLM)"}
          </button>
        </div>
      )}
      <ErrorBanner error={rescoreError} />

      <div className="space-y-3">
        {ranking.ranked.map((c) => (
          <div key={c.candidateId} className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <button
              type="button"
              onClick={() => setExpandedId(expandedId === c.candidateId ? null : c.candidateId)}
              className="flex w-full items-center justify-between px-4 py-3 text-left"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-slate-800">{c.totalScore}</span>
                <div>
                  <div className="font-medium text-slate-900">{c.fullName ?? "Unnamed candidate"}</div>
                  <div className="text-xs text-slate-500">
                    {c.topStrength ?? "—"}
                    {c.topConcern ? ` · concern: ${c.topConcern}` : ""}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {c.knockoutFailed && (
                  <span className="rounded-full border border-red-300 bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">
                    Knockout failed
                  </span>
                )}
                {c.stale && (
                  <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                    Stale
                  </span>
                )}
                <Badge recommendation={c.recommendation} />
              </div>
            </button>

            {expandedId === c.candidateId && (
              <ExpandedCandidate jobId={jobId} candidateId={c.candidateId} criteria={criteria} />
            )}
          </div>
        ))}
        {ranking.ranked.length === 0 && <p className="text-sm text-slate-400">No evaluated candidates yet.</p>}
      </div>

      {ranking.pending.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Pending</h3>
          <ErrorBanner error={pendingGenError} />
          <ul className="space-y-2">
            {ranking.pending.map((p) => (
              <li
                key={p.candidateId}
                className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-sm"
              >
                <span>
                  {p.fullName ?? p.candidateId} — {p.reason === "no_profile" ? "no profile yet" : "no evaluation yet"}
                </span>
                <button
                  type="button"
                  onClick={() => handleGeneratePending(p.candidateId, p.reason)}
                  disabled={pendingGenId === p.candidateId}
                  className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium hover:bg-slate-50 disabled:opacity-50"
                >
                  {pendingGenId === p.candidateId ? <Spinner label="Generating…" /> : "Generate"}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default RankingTab;
