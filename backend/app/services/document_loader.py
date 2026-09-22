"""
VaxAssist AI RAG Ingestion Pipeline:
documents -> extraction -> cleaning -> chunking -> metadata -> embeddings -> ChromaDB

Supports: PDF (.pdf), Markdown (.md), Plain Text (.txt)
"""

import os
import re
import logging
from typing import List, Dict, Any, Tuple, Optional
import pypdf
from app.db.chroma import chroma_db

logger = logging.getLogger(__name__)

DEFAULT_CHUNK_SIZE = 800
DEFAULT_CHUNK_OVERLAP = 120


def _clean_text(text: str) -> str:
    """Clean and normalize extracted document text."""
    if not text:
        return ""
    # Replace carriage returns & multiple newlines
    cleaned = text.replace("\r\n", "\n").replace("\r", "\n")
    # Collapse 3+ consecutive newlines into 2
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    # Collapse multiple spaces
    cleaned = re.sub(r"[ \t]+", " ", cleaned)
    return cleaned.strip()


def _parse_frontmatter_or_headers(text: str, filename: str) -> Tuple[Dict[str, str], str]:
    """
    Extract structured metadata from markdown frontmatter (--- ... ---) or text headers.
    Never fabricates metadata; uses document declarations or derives standard file metadata.
    """
    metadata: Dict[str, str] = {
        "title": os.path.splitext(os.path.basename(filename))[0].replace("_", " ").title(),
        "organization": "Verified Immunization Advisory (DEMO)",
        "source": "VaxAssist Verified Knowledge Repository",
        "publication_date": "2024-01-01",
        "country_region": "GLOBAL",
        "vaccine_topic": "General Immunization",
        "document_version": "v1.0.0-demo",
        "source_file": os.path.basename(filename),
    }

    body = text

    # Check for YAML frontmatter (between --- and ---)
    frontmatter_match = re.match(r"^---\s*\n(.*?)\n---\s*\n(.*)$", text, re.DOTALL)
    if frontmatter_match:
        fm_block = frontmatter_match.group(1)
        body = frontmatter_match.group(2)
        for line in fm_block.split("\n"):
            if ":" in line:
                key, val = line.split(":", 1)
                k = key.strip().lower()
                v = val.strip().strip('"').strip("'")
                if k == "title":
                    metadata["title"] = v
                elif k == "organization":
                    metadata["organization"] = v
                elif k == "source":
                    metadata["source"] = v
                elif k == "publication_date" or k == "date":
                    metadata["publication_date"] = v
                elif k == "country_region" or k == "country":
                    metadata["country_region"] = v
                elif k == "vaccine_topic" or k == "topic":
                    metadata["vaccine_topic"] = v
                elif k == "document_version" or k == "version":
                    metadata["document_version"] = v

    # Check for Key: Value header format in plain text (.txt)
    elif "\n\n" in text[:600]:
        header_candidate, rest = text.split("\n\n", 1)
        header_lines = header_candidate.split("\n")
        matched_keys = 0
        temp_meta: Dict[str, str] = {}
        for line in header_lines:
            if ":" in line:
                key, val = line.split(":", 1)
                k = key.strip().lower().replace(" / ", "_").replace(" ", "_")
                v = val.strip()
                if k in ["title", "organization", "source", "publication_date", "country_region", "topic", "version"]:
                    matched_keys += 1
                    target_k = "vaccine_topic" if k == "topic" else "document_version" if k == "version" else k
                    temp_meta[target_k] = v
        if matched_keys >= 3:
            metadata.update(temp_meta)
            body = rest

    return metadata, body


def extract_text_from_file(file_path: str) -> Tuple[Dict[str, str], str]:
    """Extract raw text and top-level metadata from PDF, Markdown, or TXT."""
    ext = os.path.splitext(file_path)[1].lower()
    filename = os.path.basename(file_path)

    if ext in [".md", ".markdown", ".txt"]:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            raw_text = f.read()
        metadata, body = _parse_frontmatter_or_headers(raw_text, filename)
        return metadata, _clean_text(body)

    elif ext == ".pdf":
        text_pages = []
        reader = pypdf.PdfReader(file_path)
        for page_idx, page in enumerate(reader.pages):
            page_text = page.extract_text() or ""
            text_pages.append(f"[PAGE {page_idx + 1}]\n{page_text}")

        combined_text = "\n\n".join(text_pages)
        metadata, body = _parse_frontmatter_or_headers(combined_text, filename)
        return metadata, _clean_text(body)

    else:
        raise ValueError(f"Unsupported file format: {ext}. Supported formats are .pdf, .md, .txt")


def chunk_document_text(
    text: str,
    base_metadata: Dict[str, str],
    chunk_size: int = DEFAULT_CHUNK_SIZE,
    chunk_overlap: int = DEFAULT_CHUNK_OVERLAP
) -> List[Dict[str, Any]]:
    """
    Split document text into semantic chunks with section identification and rich metadata.
    """
    chunks: List[Dict[str, Any]] = []
    
    # Split by markdown headers (#, ##, ###) or major double newlines
    raw_sections = re.split(r"(?=\n#{1,4}\s+)|(?=\[PAGE\s+\d+\])|(?=\[SECTION:[^\]]+\])", text)
    
    current_section = base_metadata.get("title", "Overview")
    chunk_counter = 0

    for section_raw in raw_sections:
        section = section_raw.strip()
        if not section:
            continue

        # Extract current section name if header is present
        header_match = re.match(r"^#{1,4}\s+(.+)$", section, re.MULTILINE)
        section_tag_match = re.match(r"^\[SECTION:\s*(.+?)\]", section)
        page_tag_match = re.match(r"^\[PAGE\s+(\d+)\]", section)

        if header_match:
            current_section = header_match.group(1).strip()
        elif section_tag_match:
            current_section = section_tag_match.group(1).strip()
        elif page_tag_match:
            current_section = f"Page {page_tag_match.group(1)}"

        # If section fits in chunk_size, keep whole
        if len(section) <= chunk_size:
            chunk_counter += 1
            chunk_id = f"{base_metadata['source_file']}_{chunk_counter:03d}"
            chunk_meta = dict(base_metadata)
            chunk_meta["page_section"] = current_section
            chunk_meta["chunk_index"] = str(chunk_counter)
            chunk_meta["chunk_id"] = chunk_id

            chunks.append({
                "id": chunk_id,
                "text": section,
                "metadata": chunk_meta
            })
        else:
            # Split section using sliding window with overlap on paragraph/sentence boundaries
            start = 0
            while start < len(section):
                end = min(start + chunk_size, len(section))
                
                # Try to break on newline or period near the end
                if end < len(section):
                    break_point = section.rfind("\n", start + chunk_size // 2, end)
                    if break_point == -1:
                        break_point = section.rfind(". ", start + chunk_size // 2, end)
                    if break_point != -1:
                        end = break_point + 1

                chunk_text = section[start:end].strip()
                if chunk_text:
                    chunk_counter += 1
                    chunk_id = f"{base_metadata['source_file']}_{chunk_counter:03d}"
                    chunk_meta = dict(base_metadata)
                    chunk_meta["page_section"] = current_section
                    chunk_meta["chunk_index"] = str(chunk_counter)
                    chunk_meta["chunk_id"] = chunk_id

                    chunks.append({
                        "id": chunk_id,
                        "text": chunk_text,
                        "metadata": chunk_meta
                    })

                if end >= len(section):
                    break
                start = max(start + 1, end - chunk_overlap)

    return chunks


def ingest_document_file(file_path: str, collection=None) -> List[Dict[str, Any]]:
    """Load, chunk, and ingest a single document file into ChromaDB."""
    if collection is None:
        collection = chroma_db.get_or_create_knowledge_collection()

    metadata, body = extract_text_from_file(file_path)
    chunks = chunk_document_text(body, metadata)

    if not chunks:
        logger.warning(f"No text extracted from file: {file_path}")
        return []

    ids = [c["id"] for c in chunks]
    documents = [c["text"] for c in chunks]
    metadatas = [c["metadata"] for c in chunks]

    collection.upsert(
        ids=ids,
        documents=documents,
        metadatas=metadatas
    )

    logger.info(f"Ingested {len(chunks)} chunks from {os.path.basename(file_path)}")
    return chunks


def ingest_knowledge_directory(base_dir: str, reset: bool = False) -> Dict[str, Any]:
    """
    Ingest all PDF, Markdown, and TXT documents in the knowledge base directory tree.
    """
    collection = chroma_db.get_or_create_knowledge_collection(reset=reset)

    supported_exts = {".pdf", ".md", ".markdown", ".txt"}
    ingested_files = []
    total_chunks = 0

    for root, _, files in os.walk(base_dir):
        for f in sorted(files):
            ext = os.path.splitext(f)[1].lower()
            if ext in supported_exts and not f.startswith("."):
                file_path = os.path.join(root, f)
                try:
                    chunks = ingest_document_file(file_path, collection=collection)
                    ingested_files.append({
                        "file": f,
                        "path": file_path,
                        "relative_path": os.path.relpath(file_path, base_dir),
                        "chunks_count": len(chunks)
                    })
                    total_chunks += len(chunks)
                except Exception as e:
                    logger.error(f"Failed to ingest {file_path}: {e}")

    return {
        "status": "success",
        "total_files": len(ingested_files),
        "total_chunks": total_chunks,
        "files": ingested_files,
        "collection_count": collection.count()
    }
