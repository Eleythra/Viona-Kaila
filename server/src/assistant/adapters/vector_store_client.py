from typing import List

from assistant.adapters.openai_client import OpenAIClientAdapter


class VectorStoreClientAdapter:
    def __init__(self, openai_adapter: OpenAIClientAdapter, vector_store_id: str):
        self.openai = openai_adapter
        self.vector_store_id = vector_store_id

    def search_context(self, query: str, model: str, include_results: bool = True):
        return self.openai.responses_create(
            model=model,
            input=query,
            tools=[
                {
                    "type": "file_search",
                    "vector_store_ids": [self.vector_store_id],
                    "max_num_results": 6,
                }
            ],
            include=["file_search_call.results"] if include_results else [],
        )

