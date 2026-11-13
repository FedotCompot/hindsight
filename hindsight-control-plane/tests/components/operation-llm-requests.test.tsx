// @vitest-environment jsdom
/**
 * The two directions of the link between a background operation and its model
 * calls: the operation's details list the runs it made, and a trace names the
 * operation that ran it.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import type { LLMRequestEntry } from "@/lib/api";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    values ? `${key} ${JSON.stringify(values)}` : key,
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("@/lib/bank-context", () => ({
  useBank: () => ({ currentBank: "bank-a" }),
}));

const listLLMRequests = vi.fn();
vi.mock("@/lib/api", () => ({
  client: { listLLMRequests: (...args: unknown[]) => listLLMRequests(...args) },
}));

const { OperationLLMRequests } = await import("@/components/operation-llm-requests");
const { TraceDialog } = await import("@/components/llm-requests-view");

function call(id: string, fields: Partial<LLMRequestEntry>): LLMRequestEntry {
  return {
    id,
    operation: "retain",
    scope: "retain_extract_facts",
    trace_id: null,
    status: "success",
    started_at: "2026-01-15T10:30:00Z",
    ended_at: "2026-01-15T10:30:02Z",
    duration_ms: 2000,
    total_tokens: 100,
    thoughts_tokens: null,
    metadata: {},
    llm_info: {},
    ...fields,
  } as LLMRequestEntry;
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("OperationLLMRequests", () => {
  it("lists one row per run the operation made", async () => {
    listLLMRequests.mockResolvedValue({
      items: [
        call("c1", { trace_id: "run-1" }),
        call("c2", { trace_id: "run-1", status: "error" }),
        call("c3", { trace_id: "run-2", operation: "consolidation" }),
      ],
    });

    render(<OperationLLMRequests bankId="bank-a" operationId="op-1" />);

    expect(await screen.findByText("consolidation")).toBeTruthy();
    expect(listLLMRequests).toHaveBeenCalledWith(
      "bank-a",
      expect.objectContaining({ operation_id: "op-1", group: true })
    );
    expect(screen.getAllByRole("button")).toHaveLength(2);
    expect(screen.getByText(/"calls":2,"tokens":"200"/)).toBeTruthy();
  });

  it("renders nothing for an operation with no recorded calls", async () => {
    listLLMRequests.mockResolvedValue({ items: [] });

    const { container } = render(<OperationLLMRequests bankId="bank-a" operationId="op-1" />);

    await waitFor(() => expect(listLLMRequests).toHaveBeenCalled());
    expect(container.innerHTML).toBe("");
  });
});

describe("TraceDialog operation link", () => {
  const entry = call("c1", { metadata: { operation_id: "op-12345678-abcd" } });

  it("links a trace to the background operation that ran it", () => {
    render(<TraceDialog bankId="bank a" entry={entry} open onOpenChange={() => {}} />);

    const link = screen.getByRole("link", { name: "op-12345" });
    expect(link.getAttribute("href")).toBe(
      "/banks/bank%20a?view=profile&bankConfigTab=general&operation=op-12345678-abcd"
    );
  });

  it("shows no link inside that operation's own details", () => {
    render(
      <TraceDialog
        bankId="bank a"
        entry={entry}
        open
        onOpenChange={() => {}}
        operationLink={false}
      />
    );

    expect(screen.queryByRole("link")).toBeNull();
  });

  it("shows no link for a call made outside a background operation", () => {
    render(<TraceDialog bankId="bank a" entry={call("c1", {})} open onOpenChange={() => {}} />);

    expect(screen.queryByRole("link")).toBeNull();
  });
});
