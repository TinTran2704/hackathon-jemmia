import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useApi } from "../hooks/useApi.js";
import * as jobsApi from "../api/jobs.js";
import ErrorBanner from "../components/ErrorBanner.jsx";
import Spinner from "../components/Spinner.jsx";
import CandidatesTab from "../features/candidates/CandidatesTab.jsx";
import CriteriaTab from "../features/criteria/CriteriaTab.jsx";
import RankingTab from "../features/ranking/RankingTab.jsx";

const TABS = ["Candidates", "Criteria", "Ranking"];

function JobDetailPage() {
  const { jobId } = useParams();
  const { data: job, error, loading } = useApi(() => jobsApi.getJob(jobId), [jobId]);
  const [tab, setTab] = useState("Candidates");

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link to="/" className="text-sm text-slate-500 hover:underline">
        ← All jobs
      </Link>

      {loading && <Spinner label="Loading job…" />}
      <ErrorBanner error={error} />

      {job && (
        <>
          <h1 className="mt-2 mb-4 text-2xl font-semibold text-slate-900">{job.title}</h1>

          <div className="mb-6 flex gap-2 border-b border-slate-200">
            {TABS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`px-3 py-2 text-sm font-medium ${
                  tab === t ? "border-b-2 border-slate-800 text-slate-900" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {tab === "Candidates" && <CandidatesTab jobId={jobId} />}
          {tab === "Criteria" && <CriteriaTab jobId={jobId} />}
          {tab === "Ranking" && <RankingTab jobId={jobId} />}
        </>
      )}
    </div>
  );
}

export default JobDetailPage;
