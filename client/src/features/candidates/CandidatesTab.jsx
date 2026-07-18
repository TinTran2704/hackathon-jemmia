import { useState } from "react";
import { useApi } from "../../hooks/useApi.js";
import * as candidatesApi from "../../api/candidates.js";
import * as jobsApi from "../../api/jobs.js";
import ErrorBanner from "../../components/ErrorBanner.jsx";
import Spinner from "../../components/Spinner.jsx";

function CandidatesTab({ jobId }) {
  const { data: candidates, error, loading, refetch } = useApi(
    () => candidatesApi.listCandidates(jobId),
    [jobId]
  );

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importError, setImportError] = useState(null);
  const [runningAll, setRunningAll] = useState(false);
  const [runAllResult, setRunAllResult] = useState(null);
  const [runAllError, setRunAllError] = useState(null);

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      await candidatesApi.uploadCv(jobId, file);
      refetch();
    } catch (err) {
      setUploadError(err);
    } finally {
      setUploading(false);
    }
  }

  async function handleImport() {
    setImporting(true);
    setImportError(null);
    setImportResult(null);
    try {
      const result = await jobsApi.importCvs(jobId);
      setImportResult(result);
      refetch();
    } catch (err) {
      setImportError(err);
    } finally {
      setImporting(false);
    }
  }

  async function handleRunAll() {
    setRunningAll(true);
    setRunAllError(null);
    setRunAllResult(null);
    try {
      const result = await jobsApi.evaluateAll(jobId);
      setRunAllResult(result);
      refetch();
    } catch (err) {
      setRunAllError(err);
    } finally {
      setRunningAll(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
          {uploading ? <Spinner label="Uploading…" /> : "Upload CV"}
          <input
            type="file"
            accept=".pdf,.docx"
            className="hidden"
            disabled={uploading}
            onChange={handleFileChange}
          />
        </label>

        <button
          type="button"
          onClick={handleImport}
          disabled={importing}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {importing ? <Spinner label="Importing from R2…" /> : "Import from R2"}
        </button>

        <button
          type="button"
          onClick={handleRunAll}
          disabled={runningAll}
          className="rounded-md bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {runningAll ? (
            <Spinner label="Running all (free-tier LLM can be slow)…" />
          ) : (
            "Run all"
          )}
        </button>
      </div>

      <ErrorBanner error={uploadError} />
      <ErrorBanner error={importError} />
      <ErrorBanner error={runAllError} />

      {importResult && (
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          Imported {importResult.imported.length}, skipped {importResult.skipped.length}, duplicates{" "}
          {importResult.duplicates.length}.
        </div>
      )}
      {runAllResult && (
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          Done: {runAllResult.done.length}. Failed: {runAllResult.failed.length}
          {runAllResult.failed.length > 0 && (
            <ul className="mt-1 list-disc pl-5">
              {runAllResult.failed.map((f) => (
                <li key={f.candidateId}>
                  {f.candidateId}: {f.code}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <ErrorBanner error={error} />
      {loading && <Spinner label="Loading candidates…" />}

      {candidates && (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
              <th className="py-2">Name / file</th>
              <th className="py-2">Profile</th>
              <th className="py-2">Uploaded</th>
            </tr>
          </thead>
          <tbody>
            {candidates.map(({ meta, hasProfile }) => (
              <tr key={meta.candidateId} className="border-b border-slate-100">
                <td className="py-2">{meta.originalName}</td>
                <td className="py-2">{hasProfile ? "✓" : "—"}</td>
                <td className="py-2 text-slate-500">{new Date(meta.uploadedAt).toLocaleString()}</td>
              </tr>
            ))}
            {candidates.length === 0 && (
              <tr>
                <td colSpan={3} className="py-4 text-center text-slate-400">
                  No candidates yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default CandidatesTab;
