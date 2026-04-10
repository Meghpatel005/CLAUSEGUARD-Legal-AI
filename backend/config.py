from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # AI provider keys
    groq_api_key: str = ""
    openrouter_api_key: str = ""

    # Model selection
    groq_model: str = "llama-3.3-70b-versatile"
    openrouter_model: str = "deepseek/deepseek-chat"

    # Retrieval / chunking parameters
    max_chunk_size: int = 500          # words per chunk
    chunk_overlap: int = 50            # words overlapping between chunks
    max_chunks_for_retrieval: int = 5  # top-k chunks injected into chat context

    class Config:
        env_file = ".env"


settings = Settings()
