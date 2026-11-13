"""A background operation and the model calls it made point at each other.

Whoever looks at a slow or failed operation wants the calls it made, and whoever looks
at a call wants the operation behind it. An async retain runs as one queued operation
and its consolidation as another: each call names the operation that ran it, and the
request list filters on that id. A recall is no background operation, so its calls
name none.
"""

from __future__ import annotations

import asyncio

import pytest
from hindsight_client_api.api.llm_traces_api import LLMTracesApi

from hindsight_system_tests.payloads import consolidation, extracted, fact

pytestmark = pytest.mark.asyncio


async def test_a_background_operation_and_its_calls_point_at_each_other(client, llm, bank_id, settled):
    llm.on_step("extract_facts").returns(extracted(fact("Alice lives in Lisbon")))
    llm.on_step("consolidate").returns(consolidation())

    await client.aretain(bank_id=bank_id, content="Alice lives in Lisbon.", retain_async=True)
    await settled(bank_id)
    await client.arecall(bank_id=bank_id, query="Where does Alice live?")

    operations = (await client.operations.list_operations(bank_id, exclude_parents=True, limit=100)).operations
    [retain] = [op for op in operations if op.task_type == "retain"]
    [consolidate] = [op for op in operations if op.task_type == "consolidation"]

    traces = LLMTracesApi(client._api_client)
    # Rows are buffered and written in batches; poll the public read endpoint.
    for _ in range(50):
        everything = (await traces.list_llm_requests(bank_id, limit=500)).items
        of_retain = (await traces.list_llm_requests(bank_id, operation_id=retain.id, limit=500)).items
        of_consolidation = (await traces.list_llm_requests(bank_id, operation_id=consolidate.id, limit=500)).items
        recalled = [row for row in everything if row.operation == "recall"]
        if of_retain and of_consolidation and recalled:
            break
        await asyncio.sleep(0.1)
    else:
        raise AssertionError(
            f"missing calls: retain={len(of_retain)} consolidation={len(of_consolidation)} recall={len(recalled)}"
        )

    assert {row.operation for row in of_retain} == {"retain"}
    assert {row.metadata["operation_id"] for row in of_retain} == {retain.id}
    assert {row.operation for row in of_consolidation} == {"consolidation"}
    assert {row.metadata["operation_id"] for row in of_consolidation} == {consolidate.id}
    assert all("operation_id" not in row.metadata for row in recalled)
