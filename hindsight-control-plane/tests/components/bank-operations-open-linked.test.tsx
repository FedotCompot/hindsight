// @vitest-environment jsdom
/**
 * A trace links to the operation that ran it: arriving with that operation's id
 * opens its details straight away.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, waitFor } from "@testing-library/react";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    values ? `${key} ${JSON.stringify(values)}` : key,
}));

vi.mock("@/lib/bank-context", () => ({
  useBank: () => ({ currentBank: "bank-a" }),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const getOperationStatus = vi.fn();
const listLLMRequests = vi.fn();
vi.mock("@/lib/api", () => ({
  client: {
    listOperations: vi.fn(async () => ({ operations: [], total: 0 })),
    getOperationStatus: (...args: unknown[]) => getOperationStatus(...args),
    listLLMRequests: (...args: unknown[]) => listLLMRequests(...args),
    retryOperation: vi.fn(),
    cancelOperation: vi.fn(),
    deleteOperation: vi.fn(),
  },
}));

vi.mock("@/components/document-chunk-modal", () => ({ DocumentChunkModal: () => null }));

const { BankOperationsView } = await import("@/components/bank-operations-view");

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("BankOperationsView opened on a linked operation", () => {
  it("loads that operation's details and its model calls", async () => {
    getOperationStatus.mockResolvedValue({
      operation_id: "op-1",
      status: "completed",
      operation_type: "retain",
      created_at: "2026-01-15T10:30:00Z",
      updated_at: "2026-01-15T10:31:30Z",
      completed_at: "2026-01-15T10:31:30Z",
      error_message: null,
    });
    listLLMRequests.mockResolvedValue({ items: [] });

    render(<BankOperationsView openOperationId="op-1" />);

    await waitFor(() => expect(getOperationStatus).toHaveBeenCalledWith("bank-a", "op-1"));
    await waitFor(() =>
      expect(listLLMRequests).toHaveBeenCalledWith(
        "bank-a",
        expect.objectContaining({ operation_id: "op-1" })
      )
    );
  });

  it("opens nothing without one", async () => {
    render(<BankOperationsView />);

    await waitFor(() => expect(getOperationStatus).not.toHaveBeenCalled());
  });
});
