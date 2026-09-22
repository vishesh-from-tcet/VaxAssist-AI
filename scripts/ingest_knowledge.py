#!/usr/bin/env python3
"""
VaxAssist AI - Knowledge Ingestion Script
Scans knowledge_base/ directory and ingests PDF, Markdown, and TXT files into ChromaDB.
"""

import os
import sys
import argparse
import logging

# Add backend directory to sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKEND_DIR = os.path.join(BASE_DIR, "backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app.services.document_loader import ingest_knowledge_directory

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("vaxassist_ingest")


def main():
    parser = argparse.ArgumentParser(description="Ingest documents into VaxAssist ChromaDB Knowledge Base")
    parser.add_argument(
        "--dir",
        type=str,
        default=os.path.join(BASE_DIR, "knowledge_base"),
        help="Path to knowledge base directory (default: ./knowledge_base)"
    )
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Wipe and reset collection before ingesting"
    )

    args = parser.parse_args()
    target_dir = os.path.abspath(args.dir)

    print("=" * 65)
    print(" VaxAssist AI - RAG Knowledge Base Ingestion Pipeline")
    print("=" * 65)
    print(f"Target Directory: {target_dir}")
    print(f"Reset Collection: {args.reset}")
    print("-" * 65)

    if not os.path.exists(target_dir):
        print(f"[ERROR] Knowledge directory not found: {target_dir}")
        sys.exit(1)

    result = ingest_knowledge_directory(base_dir=target_dir, reset=args.reset)

    print("\nIngestion Summary:")
    print(f"  * Files Processed: {result['total_files']}")
    print(f"  * Total Chunks Created: {result['total_chunks']}")
    print(f"  * Total Collection Size in ChromaDB: {result['collection_count']}")
    print("\nIndexed Files:")
    for f in result["files"]:
        print(f"  [OK] {f['relative_path']} ({f['chunks_count']} chunks)")
    print("=" * 65)
    print(" Knowledge Base Ingestion Completed Successfully!")


if __name__ == "__main__":
    main()
