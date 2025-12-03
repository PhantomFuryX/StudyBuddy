import chromadb
from chromadb.config import Settings
from chromadb.utils import embedding_functions
import os
import threading
from typing import List, Dict, Optional
from .config import OPENAI_API_KEY
import logging

logger = logging.getLogger("uvicorn.error")

CHROMA_PERSIST_DIR = os.path.join(os.path.dirname(__file__), "..", "chroma_data")

_client = None
_client_lock = threading.Lock()

def get_chroma_client():
    global _client
    with _client_lock:
        if _client is None:
            os.makedirs(CHROMA_PERSIST_DIR, exist_ok=True)
            _client = chromadb.PersistentClient(path=CHROMA_PERSIST_DIR)
    return _client

def _get_embedding_function():
    if OPENAI_API_KEY:
        try:
            ef = embedding_functions.OpenAIEmbeddingFunction(
                api_key=OPENAI_API_KEY,
                model_name="text-embedding-3-small",
            )
            logger.info("[Chroma] Using OpenAI embeddings: text-embedding-3-small")
            return ef
        except Exception as e:
            logger.warning(f"[Chroma] Failed to init OpenAI embeddings: {e}; falling back to default.")
    else:
        logger.info("[Chroma] OPENAI_API_KEY not set; using default embeddings.")
    return embedding_functions.DefaultEmbeddingFunction()


def get_user_collection(user_id: str):
    client = get_chroma_client()
    collection_name = f"user_{user_id}_questions"
    collection_name = collection_name.replace("-", "_")[:63]
    col = client.get_or_create_collection(
        name=collection_name,
        metadata={"user_id": user_id},
        embedding_function=_get_embedding_function(),
    )
    try:
        ef = col._embedding_function  # type: ignore[attr-defined]
        ef_name = getattr(ef, "model_name", None)
        logger.info(f"[Chroma] Collection '{collection_name}' ready. Embeddings: {ef_name or 'default'}")
    except Exception:
        pass
    return col

def add_questions_to_collection(user_id: str, questions: List[Dict]) -> int:
    logger.info(f"[Chroma] add_questions_to_collection called with {len(questions)} questions for user {user_id}")
    collection = get_user_collection(user_id)
    
    ids = []
    documents = []
    metadatas = []
    
    for i, q in enumerate(questions):
        base = f"{user_id}:{q.get('question','').strip()}:{q.get('category','custom')}"
        q_id = str(abs(hash(base)))
        ids.append(q_id)
        documents.append(q.get("question", ""))
        metadatas.append({
            "question": q.get("question", ""),
            "options": str(q.get("options", [])),
            "answer_index": q.get("answer_index", 0),
            "explanation": q.get("explanation", ""),
            "category": q.get("category", "custom"),
            "difficulty": q.get("difficulty", "medium"),
            "source": q.get("source", "pdf_upload")
        })
    
    if not ids:
        logger.info("[Chroma] No questions to add")
        return 0
    
    cats = list({(m.get("category") or 'custom') for m in metadatas})
    logger.info(f"[Chroma] Upserting {len(ids)} questions for user {user_id}. Categories: {cats}")
    
    # Process in batches to avoid timeout on large uploads
    BATCH_SIZE = 10
    total_added = 0
    for i in range(0, len(ids), BATCH_SIZE):
        batch_ids = ids[i:i + BATCH_SIZE]
        batch_docs = documents[i:i + BATCH_SIZE]
        batch_meta = metadatas[i:i + BATCH_SIZE]
        
        logger.info(f"[Chroma] Processing batch {i // BATCH_SIZE + 1}/{(len(ids) + BATCH_SIZE - 1) // BATCH_SIZE} ({len(batch_ids)} items)")
        try:
            collection.add(
                ids=batch_ids,
                documents=batch_docs,
                metadatas=batch_meta
            )
            total_added += len(batch_ids)
            logger.info(f"[Chroma] Batch {i // BATCH_SIZE + 1} complete")
        except Exception as e:
            logger.error(f"[Chroma] Batch {i // BATCH_SIZE + 1} failed: {e}")
            raise
    
    logger.info(f"[Chroma] Total added: {total_added}")
    return total_added

def get_questions_from_collection(
    user_id: str,
    count: int = 10,
    categories: Optional[List[str]] = None,
    query_text: Optional[str] = None,
) -> List[Dict]:
    collection = get_user_collection(user_id)
    
    total_available = collection.count()
    logger.info(f"[Chroma] get_questions_from_collection: user={user_id}, count={count}, categories={categories}, total_available={total_available}")
    if total_available == 0:
        return []
    
    fetch_count = min(count, total_available)
    
    # Build category filter - also include "custom" if user wants specific categories
    # This allows uploaded questions (often marked "custom") to be returned
    where_filter = None
    if categories:
        # Include both the requested categories AND "custom" to get uploaded questions
        expanded_categories = list(set(categories + ["custom"]))
        where_filter = {"category": {"$in": expanded_categories}}
        logger.info(f"[Chroma] Filtering by categories: {expanded_categories}")
    
    # Try semantic retrieval first
    try:
        query_text = query_text or (" ".join(categories) if categories else "exam questions")
        qres = collection.query(
            query_texts=[query_text],
            n_results=fetch_count,
            where=where_filter,
            include=["metadatas", "documents"],
        )
        ids = (qres.get("ids") or [[]])[0]
        docs = (qres.get("documents") or [[]])[0]
        metas = (qres.get("metadatas") or [[]])[0]
        logger.info(f"[Chroma] Query '{query_text}' -> {len(ids)} results (requested {fetch_count}).")
    except Exception as e:
        logger.warning(f"[Chroma] Query failed: {e}, using fallback get()")
        gres = collection.get(
            limit=fetch_count,
            where=where_filter,
            include=["metadatas", "documents"],
        )
        ids = gres.get("ids", [])
        docs = gres.get("documents", [])
        metas = gres.get("metadatas", [])
        logger.info(f"[Chroma] Query fallback (no-embed). Returned {len(ids)} docs.")
    
    questions = []
    if metas:
        import ast
        for i, meta in enumerate(metas):
            try:
                options = ast.literal_eval(meta.get("options", "[]"))
            except:
                options = []
            
            questions.append({
                "id": (ids[i] if i < len(ids) else f"q_{i}"),
                "question": (docs[i] if i < len(docs) else meta.get("question", "")),
                "options": options,
                "answer_index": int(meta.get("answer_index", 0)),
                "explanation": meta.get("explanation", ""),
                "category": meta.get("category", "custom"),
                "difficulty": meta.get("difficulty", "medium"),
                "source": "custom"
            })
    
    import random
    random.shuffle(questions)
    return questions[:count]

def get_user_question_count(user_id: str) -> int:
    collection = get_user_collection(user_id)
    return collection.count()

def clear_user_questions(user_id: str) -> bool:
    try:
        client = get_chroma_client()
        collection_name = f"user_{user_id}_questions".replace("-", "_")[:63]
        client.delete_collection(collection_name)
        return True
    except:
        return False

def get_all_questions_from_collection(user_id: str) -> List[Dict]:
    """Get ALL questions from a user's ChromaDB collection for import to MongoDB"""
    collection = get_user_collection(user_id)
    total = collection.count()
    
    if total == 0:
        return []
    
    result = collection.get(
        limit=total,
        include=["metadatas", "documents"]
    )
    
    ids = result.get("ids", [])
    docs = result.get("documents", [])
    metas = result.get("metadatas", [])
    
    questions = []
    import ast
    for i, meta in enumerate(metas):
        try:
            options = ast.literal_eval(meta.get("options", "[]"))
        except:
            options = []
        
        questions.append({
            "chroma_id": ids[i] if i < len(ids) else None,
            "question": docs[i] if i < len(docs) else meta.get("question", ""),
            "options": options,
            "answer_index": int(meta.get("answer_index", 0)),
            "explanation": meta.get("explanation", ""),
            "category": meta.get("category", "custom"),
            "difficulty": meta.get("difficulty", "medium"),
            "source": "pdf_upload",
            "uploaded_by": user_id
        })
    
    return questions

def get_all_user_collections() -> List[str]:
    """Get all user collection names from ChromaDB"""
    client = get_chroma_client()
    collections = client.list_collections()
    user_collections = []
    for col in collections:
        name = col.name if hasattr(col, 'name') else str(col)
        if name.startswith("user_") and name.endswith("_questions"):
            user_collections.append(name)
    return user_collections
