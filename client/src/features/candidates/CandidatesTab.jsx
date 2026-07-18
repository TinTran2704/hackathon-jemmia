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

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [scanningSelected, setScanningSelected] = useState(false);
  const [scanSelectedResult, setScanSelectedResult] = useState(null);
  const [scanSelectedError, setScanSelectedError] = useState(null);

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

  function toggleSelected(candidateId) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(candidateId)) next.delete(candidateId);
      else next.add(candidateId);
      return next;
    });
  }

  function toggleSelectAll() {
    if (!candidates) return;
    setSelectedIds((prev) =>
      prev.size === candidates.length ? new Set() : new Set(candidates.map((c) => c.meta.candidateId))
    );
  }

  async function handleScanSelected() {
    if (selectedIds.size === 0) return;
    setScanningSelected(true);
    setScanSelectedError(null);
    setScanSelectedResult(null);
    const done = [];
    const failed = [];
    try {
      for (const candidateId of selectedIds) {
        try {
          await candidatesApi.generateProfile(jobId, candidateId, { force: true });
          await candidatesApi.generateEvaluation(jobId, candidateId, { force: true });
          done.push(candidateId);
        } catch (err) {
          failed.push({ candidateId, code: err.code ?? "UNKNOWN_ERROR" });
        }
      }
      setScanSelectedResult({ done, failed });
      refetch();
    } catch (err) {
      setScanSelectedError(err);
    } finally {
      setScanningSelected(false);
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

        <button
          type="button"
          onClick={handleScanSelected}
          disabled={scanningSelected || selectedIds.size === 0}
          className="rounded-md border border-violet-300 bg-violet-50 px-3 py-1.5 text-sm font-medium text-violet-700 hover:bg-violet-100 disabled:opacity-50"
        >
          {scanningSelected ? (
            <Spinner label="Re-scanning selected…" />
          ) : (
            `Re-scan selected (${selectedIds.size})`
          )}
        </button>
      </div>

      <ErrorBanner error={uploadError} />
      <ErrorBanner error={importError} />
      <ErrorBanner error={runAllError} />
      <ErrorBanner error={scanSelectedError} />

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
      {scanSelectedResult && (
        <div className="rounded-md border border-violet-200 bg-violet-50 px-3 py-2 text-sm text-violet-800">
          Re-scanned: {scanSelectedResult.done.length}. Failed: {scanSelectedResult.failed.length}
          {scanSelectedResult.failed.length > 0 && (
            <ul className="mt-1 list-disc pl-5">
              {scanSelectedResult.failed.map((f) => (
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
              <th className="w-8 py-2">
                <input
                  type="checkbox"
                  checked={candidates.length > 0 && selectedIds.size === candidates.length}
                  onChange={toggleSelectAll}
                  aria-label="Select all candidates"
                />
              </th>
              <th className="py-2">Name / file</th>
              <th className="py-2">Profile</th>
              <th className="py-2">Uploaded</th>
            </tr>
          </thead>
          <tbody>
            {candidates.map(({ meta, hasProfile }) => (
              <tr key={meta.candidateId} className="border-b border-slate-100">
                <td className="py-2">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(meta.candidateId)}
                    onChange={() => toggleSelected(meta.candidateId)}
                    aria-label={`Select ${meta.originalName}`}
                  />
                </td>
                <td className="py-2">{meta.originalName}</td>
                <td className="py-2">{hasProfile ? "✓" : "—"}</td>
                <td className="py-2 text-slate-500">{new Date(meta.uploadedAt).toLocaleString()}</td>
              </tr>
            ))}
            {candidates.length === 0 && (
              <tr>
                <td colSpan={4} className="py-4 text-center text-slate-400">
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
