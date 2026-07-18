import { useState } from "react";
import { useApi } from "../../hooks/useApi.js";
import * as jobsApi from "../../api/jobs.js";
import Spinner from "../../components/Spinner.jsx";
import ErrorBanner from "../../components/ErrorBanner.jsx";

function OutboxTab({ jobId }) {
  const { data: messages, error, loading, refetch } = useApi(() => jobsApi.getOutbox(jobId), [jobId]);
  const [expandedId, setExpandedId] = useState(null);

  if (loading) return <Spinner label="Loading outbox..." />;
  if (error) return <ErrorBanner error={error} />;
  if (!messages) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">Outbox Messages</h3>
        <button
          type="button"
          onClick={refetch}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
        >
          🔄 Refresh
        </button>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        {messages.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">No sent or drafted notifications yet.</div>
        ) : (
          <div className="divide-y divide-slate-200">
            {messages.map((msg) => {
              const isExpanded = expandedId === msg.id;
              const isDigest = msg.type === "hr_digest";

              const typeBadgeColor = isDigest
                ? "bg-blue-50 text-blue-700 border-blue-200"
                : "bg-purple-50 text-purple-700 border-purple-200";

              const statusBadgeColor =
                msg.status === "sent"
                  ? "bg-green-50 text-green-700 border-green-200"
                  : msg.status === "stored"
                  ? "bg-amber-50 text-amber-700 border-amber-200"
                  : "bg-red-50 text-red-700 border-red-200";

              return (
                <div key={msg.id} className="transition hover:bg-slate-50/50">
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : msg.id)}
                    className="flex w-full flex-col gap-2 p-4 text-left sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded border px-2 py-0.5 text-xs font-semibold ${typeBadgeColor}`}>
                          {isDigest ? "HR Shortlist Digest" : "Candidate Feedback"}
                        </span>
                        <span className="text-sm font-medium text-slate-900">{msg.to}</span>
                      </div>
                      <div className="text-sm text-slate-700 font-semibold">{msg.subject}</div>
                      <div className="text-xs text-slate-400">
                        {new Date(msg.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-start sm:self-center">
                      <span className="text-xs font-medium text-slate-500 capitalize">
                        {msg.delivery === "smtp" ? "SMTP" : "Demo Mode"}
                      </span>
                      <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${statusBadgeColor}`}>
                        {msg.status}
                      </span>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-slate-100 bg-slate-50/30 p-4">
                      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-inner">
                        <span className="mb-2 block text-xs font-bold text-slate-400 uppercase tracking-wider">
                          Email Body
                        </span>
                        <pre className="whitespace-pre-wrap font-mono text-xs text-slate-700 leading-relaxed">
                          {msg.bodyText}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default OutboxTab;
