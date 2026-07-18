import { useState } from "react";
import { Link } from "react-router-dom";
import { useApi } from "../hooks/useApi.js";
import * as jobsApi from "../api/jobs.js";
import ErrorBanner from "../components/ErrorBanner.jsx";
import Spinner from "../components/Spinner.jsx";

function JobsPage() {
  const { data: jobs, error, loading, refetch } = useApi(() => jobsApi.listJobs(), []);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);

  async function handleCreate() {
    if (!title.trim() || !description.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      await jobsApi.createJob({ title, description });
      setTitle("");
      setDescription("");
      refetch();
    } catch (err) {
      setCreateError(err);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">HireKit — Jobs</h1>

      <div className="mb-8 space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Create a job</h2>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Job title"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Paste the job description…"
          rows={6}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={handleCreate}
          disabled={creating}
          className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {creating ? <Spinner label="Creating…" /> : "Create job"}
        </button>
        <ErrorBanner error={createError} />
      </div>

      <ErrorBanner error={error} />
      {loading && <Spinner label="Loading jobs…" />}

      <ul className="space-y-2">
        {jobs?.map((job) => (
          <li key={job.id}>
            <Link
              to={`/jobs/${job.id}`}
              className="block rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm hover:border-slate-300"
            >
              <div className="font-medium text-slate-900">{job.title}</div>
              <div className="text-xs text-slate-500">
                {job.status} · created {new Date(job.createdAt).toLocaleString()}
              </div>
            </Link>
          </li>
        ))}
        {jobs && jobs.length === 0 && <p className="text-sm text-slate-400">No jobs yet.</p>}
      </ul>
    </div>
  );
}

export default JobsPage;
