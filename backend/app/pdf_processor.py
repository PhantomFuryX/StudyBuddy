import io
import re
import json
from typing import List, Dict, Optional
import logging
from PyPDF2 import PdfReader
import os
import time
from langchain_openai import ChatOpenAI
from langchain.schema import HumanMessage, SystemMessage
from .config import OPENAI_API_KEY
from .chroma_client import add_questions_to_collection, get_user_question_count
from . import crud as _crud

logger = logging.getLogger("uvicorn.error")

SECTION_MAP = {
    # Reasoning - often image-based, can be skipped
    "general intelligence and reasoning": "reasoning",
    "general intelligence": "reasoning",
    "reasoning": "reasoning",
    # General Knowledge / General Awareness
    "general awareness": "gk",
    "general knowledge": "gk",
    "gk": "gk",
    # Current Affairs
    "current affairs": "current_affairs",
    "currentaffairs": "current_affairs",
    # Quantitative Aptitude
    "quantitative aptitude": "quantitative_aptitude",
    "aptitude": "quantitative_aptitude",
    "quant": "quantitative_aptitude",
    # English
    "english": "english",
    "english language": "english",
    "english comprehension": "english",
}

def _split_sections(text: str):
    logger.info(f"[PDF] _split_sections called, text length={len(text)}")
    chunks = []
    current_cat = None
    current_buf = []
    
    for line in text.splitlines():
        low = line.strip().lower()
        match_cat = None
        
        # Check for "Section : Category Name" format
        if low.startswith("section") and ":" in low:
            # Extract text after "Section :"
            section_text = low.split(":", 1)[1].strip() if ":" in low else low
            for key, cat in SECTION_MAP.items():
                if key in section_text:
                    match_cat = cat
                    break
        else:
            # Fallback: check if line contains a section keyword
            for key, cat in SECTION_MAP.items():
                if key in low and len(low) < 60:  # Section headers are usually short
                    match_cat = cat
                    break
        
        if match_cat:
            if current_buf:
                chunks.append((current_cat, "\n".join(current_buf)))
                current_buf = []
            current_cat = match_cat
            logger.info(f"[PDF] Detected section: '{line.strip()}' -> category: {match_cat}")
            continue
        
        current_buf.append(line)
    
    if current_buf:
        chunks.append((current_cat, "\n".join(current_buf)))
    
    # Log summary
    cat_summary = {}
    for cat, text in chunks:
        cat_summary[cat or "unknown"] = cat_summary.get(cat or "unknown", 0) + 1
    logger.info(f"[PDF] _split_sections found {len(chunks)} sections: {cat_summary}")
    return chunks

def extract_text_from_pdf(pdf_content: bytes) -> str:
    try:
        logger.info("[PDF] Extracting text from PDF content")
        # Default cap to keep mobile-friendly; override via MAX_PDF_PAGES
        max_pages = 50
        try:
            env_val = os.getenv("MAX_PDF_PAGES")
            if env_val:
                max_pages = int(env_val)
        except Exception:
            pass
        pdf_file = io.BytesIO(pdf_content)
        t0 = time.time()
        logger.info("[PDF] Opening PDF with PyPDF2 ...")
        reader = PdfReader(pdf_file, strict=False)
        logger.info(f"[PDF] Opened PDF in {time.time() - t0:.2f}s")
        text = ""
        total = len(reader.pages)
        limit = max_pages if max_pages else total
        logger.info(f"[PDF] Detected {total} pages (limit={limit})")
        for idx, page in enumerate(reader.pages):
            if idx >= limit:
                logger.info(f"[PDF] Page limit reached ({limit}/{total})")
                break
            try:
                p_start = time.time()
                logger.info(f"[PDF] Page {idx+1}/{total} start")
                page_text = page.extract_text()
                logger.info(f"[PDF] Page {idx+1} extracted in {time.time() - p_start:.2f}s, len={len(page_text or '')}")
            except Exception as e:
                logger.warning(f"[PDF] Failed to extract page {idx+1}: {e}")
                page_text = ""
            if page_text:
                text += page_text + "\n"
            if (idx + 1) % 10 == 0:
                logger.info(f"[PDF] Extracted {idx+1}/{total} pages")
        logger.info(f"[PDF] Text extraction complete. Pages processed: {min(limit, total)}")
        return text.strip()
    except Exception as e:
        print(f"PDF extraction error: {e}")
        return ""

def chunk_text(text: str, chunk_size: int = 3000, overlap: int = 200) -> List[str]:
    if len(text) <= chunk_size:
        return [text]
    
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        if end < len(text):
            last_period = text.rfind('.', start, end)
            last_newline = text.rfind('\n', start, end)
            break_point = max(last_period, last_newline)
            if break_point > start + chunk_size // 2:
                end = break_point + 1
        
        chunks.append(text[start:end].strip())
        start = end - overlap
    
    return chunks

def extract_existing_questions(text: str) -> List[Dict]:
    """Extract MCQ questions from text using multiple strategies."""
    logger.info(f"[PDF] extract_existing_questions called, text length={len(text)}")
    questions = []
    
    lines = text.split('\n')
    i = 0
    
    while i < len(lines):
        line = lines[i].strip()
        if not line:
            i += 1
            continue
        
        # Strategy 1: Q.N format - "Q.1  Question text" or "Q1  Question text"
        q_match = re.match(r'^Q\.?\s*(\d+)\s+(.+)', line, re.IGNORECASE)
        if q_match:
            question_text = q_match.group(2).strip()
            
            # Collect continuation lines until we hit "Ans" or option line
            j = i + 1
            while j < len(lines) and j < i + 5:
                next_line = lines[j].strip()
                if not next_line:
                    j += 1
                    continue
                # Stop if we hit Ans line or numbered option
                if re.match(r'^(Ans|[✓✗]?\s*\d+\.)', next_line, re.IGNORECASE):
                    break
                question_text += ' ' + next_line
                j += 1
            
            # Now look for options (format: ✗ 1. Option or ✓ 1. Option or just 1. Option)
            options = []
            answer_index = None
            k = j
            
            while k < min(j + 20, len(lines)) and len(options) < 4:
                opt_line = lines[k].strip()
                
                # Skip empty lines and "Ans" label
                if not opt_line or opt_line.lower() == 'ans':
                    k += 1
                    continue
                
                # Match: "✓ 1. Option" or "✗ 1. Option" or "1. Option" or "Ans ✗ 1. Option"
                opt_match = re.match(r'^(?:Ans\s*)?([✓✗])?\s*(\d+)[\.\)]\s*(.+)', opt_line)
                if opt_match:
                    marker = opt_match.group(1)
                    opt_num = int(opt_match.group(2))
                    opt_text = opt_match.group(3).strip()
                    
                    # If we see option 1 and already have options, might be next question
                    if opt_num == 1 and len(options) > 0:
                        break
                    
                    # Check if this is the correct answer (✓ marker)
                    if marker == '✓':
                        answer_index = len(options)
                    
                    options.append(opt_text)
                    
                    if len(options) == 4:
                        k += 1
                        break
                
                # Also handle A/B/C/D format
                opt_match2 = re.match(r'^([✓✗])?\s*[\(\[]?([A-Da-d])[\)\]\.\:]?\s*(.+)', opt_line)
                if opt_match2 and not opt_match:
                    marker = opt_match2.group(1)
                    opt_text = opt_match2.group(3).strip()
                    
                    if marker == '✓':
                        answer_index = len(options)
                    
                    options.append(opt_text)
                    
                    if len(options) == 4:
                        k += 1
                        break
                
                k += 1
            
            if len(options) == 4 and len(question_text) > 5:
                questions.append({
                    "question": question_text.strip(),
                    "options": options,
                    "answer_index": answer_index if answer_index is not None else 0,
                    "explanation": "",
                    "category": "custom",
                    "difficulty": "medium"
                })
                i = k
                continue
        
        # Strategy 2: Plain numbered format - "1. Question text"
        num_match = re.match(r'^(\d+)[\.\)]\s+(.{10,})', line)
        if num_match and not q_match:
            question_text = num_match.group(2).strip()
            
            j = i + 1
            while j < len(lines) and j < i + 4:
                next_line = lines[j].strip()
                if not next_line or re.match(r'^[\(\[]?[AaBb1][\)\]\.\:]', next_line):
                    break
                if re.match(r'^[✓✗]', next_line):
                    break
                question_text += ' ' + next_line
                j += 1
            
            options = []
            answer_index = None
            k = j
            
            while k < min(j + 15, len(lines)) and len(options) < 4:
                opt_line = lines[k].strip()
                
                # Match A/B/C/D or 1/2/3/4 options with optional ✓/✗ markers
                opt_match = re.match(r'^([✓✗])?\s*[\(\[]?([A-Da-d1-4])[\)\]\.\:]?\s*(.+)', opt_line)
                if opt_match:
                    marker = opt_match.group(1)
                    opt_text = opt_match.group(3).strip()
                    
                    if marker == '✓':
                        answer_index = len(options)
                    
                    options.append(opt_text.rstrip('.,;:'))
                
                k += 1
            
            if len(options) == 4 and len(question_text) > 5:
                questions.append({
                    "question": question_text,
                    "options": options,
                    "answer_index": answer_index if answer_index is not None else 0,
                    "explanation": "",
                    "category": "custom",
                    "difficulty": "medium"
                })
                i = k
                continue
        
        i += 1
    
    logger.info(f"[PDF] Extracted {len(questions)} questions")
    
    # Remove duplicates by question text
    seen = set()
    unique_questions = []
    for q in questions:
        key = q['question'][:80].lower()
        if key not in seen:
            seen.add(key)
            unique_questions.append(q)
    
    logger.info(f"[PDF] extract_existing_questions final: {len(unique_questions)} unique questions")
    return unique_questions

async def generate_questions_from_text(
    text: str, 
    count: int = 10,
    difficulty: str = "medium"
) -> List[Dict]:
    if not OPENAI_API_KEY:
        return []
    
    try:
        llm = ChatOpenAI(
            model="gpt-4o-mini",
            temperature=0.7,
            api_key=OPENAI_API_KEY
        )
        
        difficulty_desc = {
            "easy": "simple, straightforward questions suitable for beginners",
            "medium": "moderate difficulty questions for intermediate learners",
            "hard": "challenging questions that test deep understanding"
        }
        
        system_prompt = f"""You are a quiz question generator for competitive exams.
Generate exactly {count} multiple-choice questions based on the given content.
Difficulty level: {difficulty_desc.get(difficulty, difficulty_desc['medium'])}

Return ONLY a valid JSON array with this exact format:
[
  {{
    "question": "What is...?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "answer_index": 0,
    "explanation": "Brief explanation of the correct answer",
    "category": "gk/reasoning/current_affairs/custom",
    "difficulty": "{difficulty}"
  }}
]

Rules:
- Each question must have exactly 4 options
- answer_index is 0-3 (0=first option, 1=second, etc.)
- Make questions clear and unambiguous
- Provide helpful explanations
- Vary question types within the content scope"""

        chunks = chunk_text(text, 3000)
        all_questions = []
        
        questions_per_chunk = max(1, count // len(chunks))
        remaining = count
        
        for chunk in chunks[:5]:
            if remaining <= 0:
                break
            
            to_generate = min(questions_per_chunk + 2, remaining, 15)
            
            messages = [
                SystemMessage(content=system_prompt.replace(str(count), str(to_generate))),
                HumanMessage(content=f"Generate questions from this content:\n\n{chunk}")
            ]
            
            response = await llm.ainvoke(messages)
            content = response.content
            
            json_match = re.search(r'\[.*\]', content, re.DOTALL)
            if json_match:
                try:
                    questions = json.loads(json_match.group(0))
                    for q in questions:
                        if validate_question(q):
                            all_questions.append(q)
                            remaining -= 1
                            if remaining <= 0:
                                break
                except json.JSONDecodeError:
                    pass
        
        return all_questions[:count]
        
    except Exception as e:
        print(f"Question generation error: {e}")
        return []

def validate_question(q: Dict) -> bool:
    required = ["question", "options", "answer_index"]
    if not all(k in q for k in required):
        return False
    if not isinstance(q["options"], list) or len(q["options"]) != 4:
        return False
    if not isinstance(q["answer_index"], int) or q["answer_index"] < 0 or q["answer_index"] > 3:
        return False
    if not q["question"].strip():
        return False
    return True

async def process_pdf_and_store_questions(
    user_id: str,
    pdf_content: bytes,
    target_question_count: int = 10,
    difficulty: str = "medium",
    job_id: Optional[str] = None,
) -> Dict:
    logger.info(f"[PDF] Start processing for user {user_id}")
    text = extract_text_from_pdf(pdf_content)
    
    if not text:
        if job_id:
            try:
                from . import crud as _crud  # local import to avoid cycles on import time
                await _crud.update_upload_job(job_id, {"status": "error", "message": "Could not extract text from PDF"})
            except Exception:
                pass
        return {
            "success": False,
            "questions_extracted": 0,
            "total_user_questions": get_user_question_count(user_id),
            "message": "Could not extract text from PDF"
        }
    
    # Try to detect sections and extract within sections to assign categories
    existing_questions: List[Dict] = []
    for cat, section_text in _split_sections(text):
        if not section_text.strip():
            continue
        qs = extract_existing_questions(section_text)
        # Assign detected category
        for q in qs:
            q["category"] = cat or q.get("category") or "custom"
        existing_questions.extend(qs)
    # Fallback: if no sections detected, attempt over entire text
    if not existing_questions:
        existing_questions = extract_existing_questions(text)
    
    # Do not generate new questions; use only what's present in PDF
    generated_questions = []
    
    all_questions = existing_questions
    try:
        cat_counts = {}
        for q in all_questions:
            c = q.get("category") or "custom"
            cat_counts[c] = cat_counts.get(c, 0) + 1
        logger.info(f"[PDF] Extracted {len(all_questions)} questions. By category: {cat_counts}")
        if job_id:
            try:
                from . import crud as _crud
                await _crud.update_upload_job(job_id, {"extracted": len(all_questions), "message": "Embedding & storing..."})
            except Exception:
                pass
    except Exception:
        pass
    
    if all_questions:
        try:
            added = add_questions_to_collection(user_id, all_questions)
        except Exception as e:
            logger.error(f"[PDF] Chroma upsert failed: {e}")
            if job_id:
                try:
                    from . import crud as _crud
                    await _crud.update_upload_job(job_id, {"status": "error", "message": f"Embedding failed: {e}"})
                except Exception:
                    pass
            raise
        logger.info(f"[PDF] Upserted {added} questions into Chroma for user {user_id}")
    else:
        added = 0
    
    total = get_user_question_count(user_id)
    logger.info(f"[PDF] Done. Total in user bank: {total}")

    if job_id:
        try:
            from . import crud as _crud
            await _crud.update_upload_job(job_id, {"status": "done", "added": added, "message": "Completed"})
        except Exception:
            pass
    
    return {
        "success": added > 0,
        "questions_extracted": added,
        "existing_found": len(existing_questions),
        "generated": len(generated_questions),
        "total_user_questions": total,
        "message": f"Successfully added {added} questions to your question bank"
    }

def process_pdf_and_store_questions_sync(
    user_id: str,
    pdf_content: bytes,
    target_question_count: int = 10,
    difficulty: str = "medium",
    override_category: str = "",
    skip_categories: List[str] = None
) -> Dict:
    """Synchronous variant safe to call from a background thread.
    Does CPU-bound PDF parsing and synchronous Chroma upserts.
    """
    skip_categories = skip_categories or []
    logger.info(f"[PDF][sync] Start processing for user {user_id}, category={override_category}, skip={skip_categories}")
    text = extract_text_from_pdf(pdf_content)
    if not text:
        return {
            "success": False,
            "questions_extracted": 0,
            "total_user_questions": get_user_question_count(user_id),
            "message": "Could not extract text from PDF"
        }

    logger.info(f"[PDF][sync] Text extracted, length={len(text)}. Parsing sections...")
    existing_questions: List[Dict] = []
    skipped_count = 0
    
    for cat, section_text in _split_sections(text):
        if not section_text.strip():
            continue
        
        # Skip categories if requested (e.g., skip "reasoning" for image-based questions)
        if cat and cat in skip_categories:
            logger.info(f"[PDF][sync] Skipping section: {cat}")
            skipped_count += 1
            continue
        
        qs = extract_existing_questions(section_text)
        for q in qs:
            # Use override_category if provided, else detected category, else "custom"
            q["category"] = override_category or cat or q.get("category") or "custom"
        existing_questions.extend(qs)
        logger.info(f"[PDF][sync] Section '{cat}' -> {len(qs)} questions extracted")
    
    if not existing_questions:
        logger.info("[PDF][sync] No sections found, parsing entire text...")
        existing_questions = extract_existing_questions(text)
        # Apply override_category to all questions if provided
        if override_category:
            for q in existing_questions:
                q["category"] = override_category

    generated_questions: List[Dict] = []
    all_questions = existing_questions
    cat_counts = {}
    for q in all_questions:
        c = q.get("category") or "custom"
        cat_counts[c] = cat_counts.get(c, 0) + 1
    logger.info(f"[PDF][sync] Extracted {len(all_questions)} questions. By category: {cat_counts}")

    if all_questions:
        logger.info(f"[PDF][sync] Starting ChromaDB upsert for {len(all_questions)} questions...")
        try:
            added = add_questions_to_collection(user_id, all_questions)
        except Exception as e:
            logger.error(f"[PDF][sync] Chroma upsert failed: {e}")
            return {
                "success": False,
                "questions_extracted": 0,
                "existing_found": len(existing_questions),
                "generated": 0,
                "total_user_questions": get_user_question_count(user_id),
                "message": f"Embedding failed: {e}"
            }
        logger.info(f"[PDF][sync] Upserted {added} questions into Chroma for user {user_id}")
    else:
        added = 0
        logger.info("[PDF][sync] No questions found in PDF")

    total = get_user_question_count(user_id)
    logger.info(f"[PDF][sync] Done. Total in user bank: {total}")
    return {
        "success": added > 0 or len(existing_questions) == 0,
        "questions_extracted": added,
        "existing_found": len(existing_questions),
        "generated": len(generated_questions),
        "total_user_questions": total,
        "message": f"Successfully added {added} questions to your question bank" if added > 0 else "No questions found in PDF"
    }
