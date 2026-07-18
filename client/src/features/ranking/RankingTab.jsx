import { useState, useEffect } from "react";
import { useApi } from "../../hooks/useApi.js";
import * as jobsApi from "../../api/jobs.js";
import * as candidatesApi from "../../api/candidates.js";
import Badge from "../../components/Badge.jsx";
import ErrorBanner from "../../components/ErrorBanner.jsx";
import Spinner from "../../components/Spinner.jsx";
import ScoreBar from "../../components/ScoreBar.jsx";
import EvidenceQuote from "../../components/EvidenceQuote.jsx";

function QuestionCard({ q, type }) {
  const badgeColor =
    type === "strength"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : type === "verification"
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : "bg-blue-50 text-blue-700 border-blue-200";

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:shadow transition flex flex-col justify-between">
      <div>
        <div className="flex justify-between items-start mb-2">
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${badgeColor}`}>
            {type}
          </span>
        </div>
        <p className="text-sm font-semibold text-slate-900 mb-2 leading-snug">{q.question}</p>
        <blockquote className="border-l-2 border-slate-300 bg-slate-50/55 px-2.5 py-1.5 text-xs text-slate-500 italic rounded-r mb-2 leading-relaxed">
          Based on: "{q.basedOn}"
        </blockquote>
        <div className="text-[11px] text-slate-600 mb-2">
          <span className="font-semibold text-slate-400">Intent:</span> {q.intent}
        </div>
      </div>
      <div className="border-t border-slate-100 pt-2 mt-2">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Listen For:</span>
        <ul className="space-y-1">
          {q.listenFor.map((item, idx) => (
            <li key={idx} className="flex items-start gap-1.5 text-xs text-slate-700">
              <span className="text-green-600 font-bold">✓</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function InterviewKitSection({ jobId, candidateId, evaluation }) {
  const [kit, setKit] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const [comments, setComments] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState(null);

  async function loadKit() {
    setLoading(true);
    setError(null);
    try {
      const data = await candidatesApi.getInterviewKit(jobId, candidateId);
      setKit(data);
    } catch (err) {
      if (err.code === "INTERVIEW_KIT_NOT_FOUND") {
        setKit(null);
      } else {
        setError(err);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadKit();
  }, [jobId, candidateId]);

  async function handleGenerate(force = false, regenComments = null) {
    setLoading(true);
    setError(null);
    try {
      const data = await candidatesApi.generateInterviewKit(jobId, candidateId, {
        force,
        comments: regenComments,
      });
      setKit(data);
      if (regenComments) setComments("");
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSendInvite() {
    setInviting(true);
    setInviteError(null);
    try {
      await candidatesApi.sendInterviewInvitation(jobId, candidateId);
      await loadKit(); // Reload to pick up invitationSent = true
    } catch (err) {
      setInviteError(err);
    } finally {
      setInviting(false);
    }
  }

  function handleCopyAll() {
    if (!kit) return;
    const text = `INTERVIEW KIT - ${evaluation.fullName ?? "Candidate"}
Opening Note:
${kit.openingNote}

STRENGTH PROBES:
${kit.strengthProbes.map((q, i) => `${i + 1}. Question: ${q.question}\n   Based on: ${q.basedOn}\n   Intent: ${q.intent}\n   Listen for: ${q.listenFor.join(', ')}`).join('\n\n')}

VERIFICATION PROBES:
${kit.verificationProbes.map((q, i) => `${i + 1}. Question: ${q.question}\n   Based on: ${q.basedOn}\n   Intent: ${q.intent}\n   Listen for: ${q.listenFor.join(', ')}`).join('\n\n')}

FIT QUESTIONS:
${kit.fitQuestions.map((q, i) => `${i + 1}. Question: ${q.question}\n   Based on: ${q.basedOn}\n   Intent: ${q.intent}\n   Listen for: ${q.listenFor.join(', ')}`).join('\n\n')}
`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading && !kit) return <Spinner label="Loading Interview Kit..." />;

  const isStale = kit && kit.evaluationVersion !== evaluation.evaluatedAt;

  return (
    <div className="mt-6 border-t border-slate-200 pt-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-slate-800">Personalized Interview Kit</h4>
        {kit && (
          <div className="flex items-center gap-2">
            {kit.invitationSent ? (
              <span className="rounded bg-green-50 border border-green-200 px-2.5 py-1 text-xs font-semibold text-green-700">
                ✓ Invitation Sent
              </span>
            ) : (
              <button
                type="button"
                onClick={handleSendInvite}
                disabled={inviting || loading}
                className="rounded-md bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white transition disabled:opacity-50"
              >
                {inviting ? "Sending..." : "✉️ Send Invitation"}
              </button>
            )}
            <button
              type="button"
              onClick={handleCopyAll}
              className="rounded-md bg-slate-100 hover:bg-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition"
            >
              {copied ? "✓ Copied!" : "📋 Copy all"}
            </button>
            <button
              type="button"
              onClick={() => handleGenerate(true)}
              disabled={loading}
              className="rounded-md bg-violet-50 hover:bg-violet-100 px-3 py-1.5 text-xs font-semibold text-violet-700 transition"
            >
              {loading ? "Regenerating..." : "Regenerate"}
            </button>
          </div>
        )}
      </div>

      <ErrorBanner error={error || inviteError} />

      {!kit ? (
        <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center">
          <p className="text-sm text-slate-500 mb-3">No interview kit generated yet for this candidate.</p>
          <button
            type="button"
            onClick={() => handleGenerate(false)}
            disabled={loading}
            className="rounded-md bg-violet-600 hover:bg-violet-700 px-4 py-2 text-sm font-semibold text-white transition shadow-sm disabled:opacity-50"
          >
            {loading ? "Generating Kit..." : "✨ Generate Interview Kit"}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {isStale && (
            <div className="flex items-center justify-between rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <span>This kit is stale (evaluation was updated since it was built).</span>
              <button
                type="button"
                onClick={() => handleGenerate(true)}
                disabled={loading}
                className="rounded-md bg-amber-600 hover:bg-amber-700 px-2.5 py-1 text-white transition font-semibold"
              >
                {loading ? "Updating..." : "Update Kit"}
              </button>
            </div>
          )}

          <div className="rounded-md border border-slate-100 bg-slate-50/50 p-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Opening Note</span>
            <p className="text-sm text-slate-700 italic">"{kit.openingNote}"</p>
          </div>

          {kit.comments && (
            <div className="rounded-md border border-violet-100 bg-violet-50/30 p-3 text-xs text-violet-800">
              <span className="font-bold">HR Guidelines Applied:</span> "{kit.comments}"
            </div>
          )}

          <div className="space-y-3">
            <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Strength Probes</h5>
            <div className="grid gap-3 sm:grid-cols-2">
              {kit.strengthProbes.map((q, idx) => (
                <QuestionCard key={idx} q={q} type="strength" />
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Verification Probes</h5>
            <div className="grid gap-3 sm:grid-cols-2">
              {kit.verificationProbes.map((q, idx) => (
                <QuestionCard key={idx} q={q} type="verification" />
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Fit Questions</h5>
            <div className="grid gap-3 sm:grid-cols-2">
              {kit.fitQuestions.map((q, idx) => (
                <QuestionCard key={idx} q={q} type="fit" />
              ))}
            </div>
          </div>

          {/* Comment box for question refining */}
          <div className="mt-4 border-t border-slate-200 pt-4 bg-slate-50/50 rounded-lg p-3">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
              Refine Questions (HR Comments)
            </span>
            <textarea
              placeholder="Enter feedback or guidelines to customize this kit (e.g. 'emphasize database performance and indexing skills', 'probe why they changed jobs in 2024')..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="w-full rounded border border-slate-200 p-2 text-xs focus:border-slate-400 focus:outline-none"
              rows={2}
            />
            <button
              type="button"
              onClick={() => handleGenerate(true, comments)}
              disabled={loading || !comments.trim()}
              className="mt-2 rounded bg-violet-600 hover:bg-violet-700 px-3 py-1.5 text-xs font-semibold text-white transition disabled:opacity-50"
            >
              {loading ? "Regenerating..." : "✨ Regenerate Questions based on Comments"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function FeedbackDraftSection({ jobId, candidateId, recommendation, onTabChange }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  if (recommendation !== "weak_match" && recommendation !== "reject_review") return null;

  async function handleDraftFeedback() {
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await candidatesApi.sendCandidateFeedback(jobId, candidateId);
      setSuccessMsg(`Feedback email drafted successfully to ${res.to}!`);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4 border-t border-slate-200 pt-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-md p-3">
        <div>
          <h5 className="text-xs font-semibold text-slate-800">Draft Candidate Feedback Email</h5>
          <p className="text-[11px] text-slate-500">
            Generates constructive, warm feedback based on the candidate's lowest-scoring criteria.
          </p>
        </div>
        <button
          type="button"
          onClick={handleDraftFeedback}
          disabled={loading}
          className="self-start sm:self-center rounded bg-amber-600 hover:bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white transition disabled:opacity-50"
        >
          {loading ? "Drafting..." : "✉️ Draft feedback email"}
        </button>
      </div>
      <ErrorBanner error={error} />
      {successMsg && (
        <div className="mt-2 flex items-center justify-between rounded bg-green-50 border border-green-200 px-3 py-2 text-xs text-green-800">
          <span>{successMsg}</span>
          <button
            type="button"
            onClick={() => onTabChange("Outbox")}
            className="underline font-semibold hover:text-green-950 transition"
          >
            Go to Outbox
          </button>
        </div>
      )}
    </div>
  );
}

function DecisionOverrideSection({ jobId, candidateId, evaluation, refetchEval, refetchRanking }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const isFailed = evaluation.knockoutFailed || evaluation.recommendation === "reject_review";
  const decision = evaluation.hrDecision;

  async function handleDecision(newDecision) {
    setLoading(true);
    setError(null);
    try {
      await candidatesApi.setCandidateDecision(jobId, candidateId, newDecision);
      await refetchEval();
      if (refetchRanking) refetchRanking();
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3 mb-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">HR Screening Override</span>
          <div className="mt-1 text-sm text-slate-700 font-medium">
            Current Status:{" "}
            {decision === "passed" ? (
              <span className="text-green-700 font-bold">Passed by HR</span>
            ) : decision === "potential" ? (
              <span className="text-amber-700 font-bold">Potential (Under Consideration)</span>
            ) : decision === "rejected" ? (
              <span className="text-red-700 font-bold">Rejected by HR</span>
            ) : isFailed ? (
              <span className="text-red-700 font-bold">Failed Automated Screening</span>
            ) : (
              <span className="text-green-700 font-bold">Passed Automated Screening</span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {decision !== "passed" && (
            <button
              type="button"
              onClick={() => handleDecision("passed")}
              disabled={loading}
              className="rounded bg-green-600 hover:bg-green-700 px-3 py-1.5 text-xs font-semibold text-white transition disabled:opacity-50"
            >
              Mark as Passed
            </button>
          )}
          {decision !== "potential" && decision !== "passed" && decision !== "rejected" && (
            <button
              type="button"
              onClick={() => handleDecision("potential")}
              disabled={loading}
              className="rounded bg-amber-500 hover:bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition disabled:opacity-50"
            >
              Mark as Potential
            </button>
          )}
          {decision !== "rejected" && (
            <button
              type="button"
              onClick={() => handleDecision("rejected")}
              disabled={loading}
              className="rounded bg-red-600 hover:bg-red-700 px-3 py-1.5 text-xs font-semibold text-white transition disabled:opacity-50"
            >
              Reject
            </button>
          )}
        </div>
      </div>
      <ErrorBanner error={error} />
    </div>
  );
}

function ExpandedCandidate({ jobId, candidateId, criteria, onTabChange, refetchRanking }) {
  const { data: evaluation, error, loading, refetch: refetchEval } = useApi(
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

  const isFailed = evaluation.knockoutFailed || evaluation.recommendation === "reject_review";
  const canShowKit = !isFailed || evaluation.hrDecision === "passed";

  return (
    <div className="space-y-4 border-t border-slate-100 px-4 py-4">
      <DecisionOverrideSection
        jobId={jobId}
        candidateId={candidateId}
        evaluation={evaluation}
        refetchEval={refetchEval}
        refetchRanking={refetchRanking}
      />

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

      {/* Draft Rejection Email */}
      {(evaluation.hrDecision === "rejected" || (!evaluation.hrDecision && isFailed)) && (
        <FeedbackDraftSection
          jobId={jobId}
          candidateId={candidateId}
          recommendation={evaluation.recommendation}
          onTabChange={onTabChange}
        />
      )}

      {/* Interview Question Kit generation block */}
      {canShowKit ? (
        <InterviewKitSection
          jobId={jobId}
          candidateId={candidateId}
          evaluation={evaluation}
        />
      ) : (
        <div className="rounded-md border border-slate-200 bg-slate-50 p-4 text-center mt-6">
          <p className="text-xs text-slate-500 font-medium">
            Interview Question Kit is locked. You must mark this candidate as "Passed" to generate and review the questions.
          </p>
        </div>
      )}
    </div>
  );
}

function RankingTab({ jobId, onTabChange }) {
  const { data: ranking, error, loading, refetch } = useApi(() => jobsApi.getRanking(jobId), [jobId]);
  const { data: criteria } = useApi(() => jobsApi.getCriteria(jobId).catch(() => null), [jobId]);
  const [expandedId, setExpandedId] = useState(null);
  const [rescoring, setRescoring] = useState(false);
  const [rescoreError, setRescoreError] = useState(null);
  const [pendingGenId, setPendingGenId] = useState(null);
  const [pendingGenError, setPendingGenError] = useState(null);

  const [hrEmail, setHrEmail] = useState("");
  const [sendingDigest, setSendingDigest] = useState(false);
  const [digestError, setDigestError] = useState(null);
  const [digestSuccess, setDigestSuccess] = useState(null);

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

  async function handleSendDigest(e) {
    e.preventDefault();
    if (!hrEmail) return;
    setSendingDigest(true);
    setDigestError(null);
    setDigestSuccess(null);
    try {
      const res = await jobsApi.sendHrDigest(jobId, hrEmail);
      setDigestSuccess(`Shortlist digest sent successfully to ${res.to}!`);
      setHrEmail("");
    } catch (err) {
      setDigestError(err);
    } finally {
      setSendingDigest(false);
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
      {/* Send HR Digest Header Form */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">HR Shortlist Digest</h3>
          <p className="text-xs text-slate-500 font-medium">Send the current candidate shortlist digest to HR.</p>
        </div>
        <form onSubmit={handleSendDigest} className="flex gap-2 w-full md:w-auto">
          <input
            type="email"
            placeholder="hr@company.com"
            value={hrEmail}
            onChange={(e) => setHrEmail(e.target.value)}
            required
            className="flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-xs focus:border-slate-500 focus:outline-none md:w-64"
          />
          <button
            type="submit"
            disabled={sendingDigest}
            className="rounded bg-slate-800 hover:bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white transition disabled:opacity-50 whitespace-nowrap"
          >
            {sendingDigest ? "Sending..." : "Send Digest"}
          </button>
        </form>
      </div>
      <ErrorBanner error={digestError} />
      {digestSuccess && (
        <div className="flex items-center justify-between rounded bg-green-50 border border-green-200 px-3 py-2 text-xs text-green-800 mb-4">
          <span>{digestSuccess}</span>
          <button
            type="button"
            onClick={() => onTabChange("Outbox")}
            className="underline font-semibold hover:text-green-950 transition"
          >
            Go to Outbox
          </button>
        </div>
      )}

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
                {c.hrDecision === "passed" && (
                  <span className="rounded-full border border-green-300 bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700">
                    ✓ Passed by HR
                  </span>
                )}
                {c.hrDecision === "potential" && (
                  <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                    ⚠ Potential
                  </span>
                )}
                {c.hrDecision === "rejected" && (
                  <span className="rounded-full border border-red-300 bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">
                    ✗ Rejected by HR
                  </span>
                )}
                {!c.hrDecision && c.knockoutFailed && (
                  <span className="rounded-full border border-red-300 bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">
                    Knockout failed
                  </span>
                )}
                {c.stale && (
                  <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                    Stale
                  </span>
                )}
                <Badge recommendation={c.hrDecision === "rejected" ? "reject_review" : c.recommendation} />
              </div>
            </button>

            {expandedId === c.candidateId && (
              <ExpandedCandidate
                jobId={jobId}
                candidateId={c.candidateId}
                criteria={criteria}
                onTabChange={onTabChange}
                refetchRanking={refetch}
              />
            )}
          </div>
        ))}
        {ranking.ranked.length === 0 && <p className="text-sm text-slate-400">No evaluated candidates yet.</p>}
      </div>

      {ranking.pending.length > 0 && (
        <div className="mt-6">
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
