import asyncio
import os
import logging
from typing import List, Optional

import httpx
from duckduckgo_search import DDGS

from .pdf_processor import process_pdf_and_store_questions_sync

logger = logging.getLogger("uvicorn.error")

DEFAULT_QUERIES = [
    'SSC CGL previous year paper filetype:pdf',
    'SSC CHSL previous year paper filetype:pdf',
    'Railway NTPC previous year paper filetype:pdf',
    'SSC GD previous year paper filetype:pdf',
    'RRB Group D previous year paper filetype:pdf',
]

MAX_PDF_MB = 15
TIMEOUT = httpx.Timeout(30.0, connect=15.0)
HEADERS = {"User-Agent": "StudyBuddyBot/1.0 (+https://studybuddy.app)"}


def _is_pdf_url(url: str) -> bool:
    if not url:
        return False
    u = url.lower()
    # More permissive check for PDF URLs
    if u.endswith('.pdf'):
        return True
    if 'pdf' in u and any(kw in u for kw in ['download', 'previous', 'paper', 'question', 'exam']):
        return True
    return False


async def _fetch_pdf(url: str) -> Optional[bytes]:
    async with httpx.AsyncClient(timeout=TIMEOUT, headers=HEADERS, follow_redirects=True) as client:
        try:
            r = await client.get(url)
            ct = r.headers.get('content-type', '').lower()
            if 'application/pdf' not in ct and not url.lower().endswith('.pdf'):
                return None
            content = r.content
            if len(content) > MAX_PDF_MB * 1024 * 1024:
                return None
            return content
        except Exception:
            return None


def search_pdf_links(queries: List[str], max_results: int = 25) -> List[str]:
    pdf_links: List[str] = []
    all_links: List[str] = []  # For debugging
    
    try:
        with DDGS() as ddgs:
            for q in queries:
                logger.info(f"[WebIngest] Searching: {q}")
                try:
                    results = list(ddgs.text(q, max_results=max_results))
                    logger.info(f"[WebIngest] Got {len(results)} results for query")
                    
                    for r in results:
                        link = r.get('href') or r.get('link') or r.get('url')
                        if link:
                            all_links.append(link)
                            if _is_pdf_url(link):
                                pdf_links.append(link)
                                logger.info(f"[WebIngest] Found PDF: {link[:80]}")
                except Exception as e:
                    logger.error(f"[WebIngest] Search error for '{q}': {e}")
                    continue
    except Exception as e:
        logger.error(f"[WebIngest] DuckDuckGo init error: {e}")
    
    logger.info(f"[WebIngest] Total links found: {len(all_links)}, PDF links: {len(pdf_links)}")
    
    # de-duplicate preserving order
    seen = set()
    unique_links = []
    for url in pdf_links:
        if url not in seen:
            seen.add(url)
            unique_links.append(url)
    return unique_links


async def ingest_from_web(
    user_id: str, 
    queries: Optional[List[str]] = None, 
    limit_per_query: int = 25,
    skip_categories: Optional[List[str]] = None
) -> dict:
    """
    Search for PDF question papers on the web and ingest them.
    
    Args:
        user_id: Target user to own the questions
        queries: Search queries (defaults to SSC/Railway papers)
        limit_per_query: Max results per query
        skip_categories: Categories to skip (e.g., ['reasoning'])
    """
    queries = queries or DEFAULT_QUERIES
    skip_categories = skip_categories or []
    
    logger.info(f"[WebIngest] Starting web ingestion for user {user_id}")
    logger.info(f"[WebIngest] Queries: {queries}")
    
    links = search_pdf_links(queries, max_results=limit_per_query)
    logger.info(f"[WebIngest] Found {len(links)} unique PDF links")
    
    total_added = 0
    processed = 0
    failed = 0
    results_by_pdf = []
    
    for i, url in enumerate(links):
        logger.info(f"[WebIngest] Processing PDF {i+1}/{len(links)}: {url[:80]}...")
        pdf_bytes = await _fetch_pdf(url)
        if not pdf_bytes:
            logger.warning(f"[WebIngest] Failed to fetch: {url[:80]}")
            failed += 1
            continue
        
        try:
            # Use sync processor (runs in thread pool in API context)
            result = process_pdf_and_store_questions_sync(
                user_id=user_id, 
                pdf_content=pdf_bytes, 
                target_question_count=0,
                skip_categories=skip_categories
            )
            questions_added = int(result.get('questions_extracted', 0))
            total_added += questions_added
            processed += 1
            results_by_pdf.append({
                "url": url[:100],
                "questions_added": questions_added,
                "status": "success" if result.get('success') else "partial"
            })
            logger.info(f"[WebIngest] PDF {i+1}: Added {questions_added} questions")
        except Exception as e:
            logger.error(f"[WebIngest] Error processing {url[:80]}: {e}")
            failed += 1
            results_by_pdf.append({
                "url": url[:100],
                "questions_added": 0,
                "status": "error",
                "error": str(e)
            })
    
    logger.info(f"[WebIngest] Complete: {processed} PDFs processed, {total_added} questions added, {failed} failed")
    
    return {
        "success": True,
        "processed_pdfs": processed,
        "failed_pdfs": failed,
        "questions_added": total_added,
        "unique_links": len(links),
        "results": results_by_pdf[:10]  # First 10 results for API response
    }


async def scrape_pdf_links_from_page(url: str) -> List[str]:
    """Scrape a webpage for PDF links (e.g., cracku.in, adda247.com)"""
    pdf_links = []
    
    async with httpx.AsyncClient(timeout=TIMEOUT, headers=HEADERS, follow_redirects=True) as client:
        try:
            logger.info(f"[WebIngest] Scraping page: {url}")
            r = await client.get(url)
            html = r.text
            
            # Find all href links that look like PDFs
            import re
            # Match href="...pdf" or href='...pdf'
            href_pattern = r'href=["\']([^"\']*\.pdf[^"\']*)["\']'
            matches = re.findall(href_pattern, html, re.IGNORECASE)
            
            for link in matches:
                # Handle relative URLs
                if link.startswith('/'):
                    from urllib.parse import urlparse
                    parsed = urlparse(url)
                    full_url = f"{parsed.scheme}://{parsed.netloc}{link}"
                elif link.startswith('http'):
                    full_url = link
                else:
                    full_url = f"{url.rstrip('/')}/{link}"
                
                pdf_links.append(full_url)
            
            logger.info(f"[WebIngest] Found {len(pdf_links)} PDF links on page")
            
        except Exception as e:
            logger.error(f"[WebIngest] Failed to scrape {url}: {e}")
    
    # Deduplicate
    return list(set(pdf_links))


async def ingest_from_urls(
    user_id: str,
    urls: List[str],
    skip_categories: Optional[List[str]] = None,
    scrape_pages: bool = False
) -> dict:
    """
    Ingest PDFs from a list of URLs.
    
    Args:
        user_id: Target user to own the questions
        urls: List of PDF URLs or page URLs containing PDF links
        skip_categories: Categories to skip
        scrape_pages: If True, treat URLs as pages to scrape for PDF links
    """
    skip_categories = skip_categories or []
    pdf_urls = []
    
    if scrape_pages:
        # Scrape each URL for PDF links
        for page_url in urls:
            links = await scrape_pdf_links_from_page(page_url)
            pdf_urls.extend(links)
        pdf_urls = list(set(pdf_urls))  # Deduplicate
        logger.info(f"[WebIngest] Total PDF links from scraping: {len(pdf_urls)}")
    else:
        pdf_urls = urls
    
    total_added = 0
    processed = 0
    failed = 0
    results = []
    
    for i, url in enumerate(pdf_urls[:50]):  # Limit to 50 PDFs
        logger.info(f"[WebIngest] Processing PDF {i+1}/{len(pdf_urls)}: {url[:80]}...")
        pdf_bytes = await _fetch_pdf(url)
        
        if not pdf_bytes:
            logger.warning(f"[WebIngest] Failed to fetch: {url[:80]}")
            failed += 1
            results.append({"url": url[:100], "status": "fetch_failed", "questions": 0})
            continue
        
        try:
            result = process_pdf_and_store_questions_sync(
                user_id=user_id,
                pdf_content=pdf_bytes,
                target_question_count=0,
                skip_categories=skip_categories
            )
            questions_added = int(result.get('questions_extracted', 0))
            total_added += questions_added
            processed += 1
            results.append({"url": url[:100], "status": "success", "questions": questions_added})
            logger.info(f"[WebIngest] PDF {i+1}: Added {questions_added} questions")
        except Exception as e:
            logger.error(f"[WebIngest] Error processing {url[:80]}: {e}")
            failed += 1
            results.append({"url": url[:100], "status": "error", "error": str(e)[:100]})
    
    return {
        "success": True,
        "total_urls": len(pdf_urls),
        "processed": processed,
        "failed": failed,
        "questions_added": total_added,
        "results": results[:20]
    }


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description='Ingest previous year papers from the web into ChromaDB')
    parser.add_argument('--user-id', required=True, help='Target user id to own the ingested questions')
    parser.add_argument('--queries', nargs='*', help='Override search queries')
    parser.add_argument('--limit', type=int, default=25, help='Max results per query')
    args = parser.parse_args()

    out = asyncio.run(ingest_from_web(args.user_id, args.queries, args.limit))
    print(out)
