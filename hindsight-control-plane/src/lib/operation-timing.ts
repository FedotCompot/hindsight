/** The run times an operation carries, on both the list and the status response. */
export interface OperationRunTimes {
  status?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
}

/**
 * How long the operation's last attempt ran, in milliseconds: from the worker
 * picking it up to its end, or to `nowMs` while it is still running. Null when
 * it never started (queued, deferred, cancelled before a worker took it).
 */
export function operationDurationMs(op: OperationRunTimes, nowMs: number): number | null {
  if (!op.started_at) return null;
  const start = Date.parse(op.started_at);
  if (Number.isNaN(start)) return null;
  if (op.completed_at) {
    const end = Date.parse(op.completed_at);
    return Number.isNaN(end) ? null : Math.max(0, end - start);
  }
  return op.status === "processing" ? Math.max(0, nowMs - start) : null;
}

/** 850ms, 12.3s, 4m 5s, 1h 12m. */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1).replace(/\.0$/, "")}s`;
  const secs = Math.floor(ms / 1000);
  if (secs < 3600) return `${Math.floor(secs / 60)}m ${secs % 60}s`;
  return `${Math.floor(secs / 3600)}h ${Math.floor((secs % 3600) / 60)}m`;
}
