"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { client, type LLMRequestEntry } from "@/lib/api";
import { aggregateGroup, formatDurationMs, groupByTrace, TraceDialog } from "./llm-requests-view";

/**
 * The model calls a background operation made, one row per run, each opening the
 * trace dialog. Renders nothing when it has none: tracing off, rows past their
 * retention, or an operation that calls no model.
 */
export function OperationLLMRequests({
  bankId,
  operationId,
}: {
  bankId: string;
  operationId: string;
}) {
  const t = useTranslations("bankOperations");
  const [rows, setRows] = useState<LLMRequestEntry[]>([]);
  const [dialogEntry, setDialogEntry] = useState<LLMRequestEntry | null>(null);

  useEffect(() => {
    let cancelled = false;
    setRows([]);
    client
      .listLLMRequests(bankId, { operation_id: operationId, group: true, limit: 50 })
      .then((data) => {
        if (!cancelled) setRows(data.items || []);
      })
      .catch(() => {
        // The API client already reports the error; the section just stays hidden.
      });
    return () => {
      cancelled = true;
    };
  }, [bankId, operationId]);

  if (rows.length === 0) return null;

  return (
    <div>
      <div className="text-sm font-medium text-muted-foreground mb-2">{t("llmRequests")}</div>
      <div className="rounded-lg border bg-muted/30 p-1 space-y-0.5">
        {groupByTrace(rows).map((run) => {
          const agg = aggregateGroup(run.rows);
          return (
            <button
              key={run.key}
              type="button"
              onClick={() => setDialogEntry(run.rows[0])}
              className="w-full flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 rounded-md px-2 py-1.5 text-sm text-left hover:bg-muted"
            >
              <span className="inline-flex items-center gap-2 min-w-0">
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${agg.status === "error" ? "bg-red-500" : "bg-green-500"}`}
                />
                <span className="font-mono text-xs">{run.rows[0].operation || "—"}</span>
                <span className="text-muted-foreground text-xs truncate">
                  {agg.startIso ? new Date(agg.startIso).toLocaleString() : ""}
                </span>
              </span>
              <span className="text-muted-foreground text-xs font-mono shrink-0">
                {t("llmRequestsSummary", {
                  calls: run.rows.length,
                  tokens: agg.tokens.toLocaleString(),
                })}
                {" · "}
                {formatDurationMs(agg.durationMs)}
              </span>
            </button>
          );
        })}
      </div>
      <TraceDialog
        bankId={bankId}
        entry={dialogEntry}
        open={!!dialogEntry}
        onOpenChange={(open) => !open && setDialogEntry(null)}
        operationLink={false}
      />
    </div>
  );
}
