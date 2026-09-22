#!/usr/bin/env python3
"""
VaxAssist AI - Rebuild Collection Script
Drops and completely re-creates ChromaDB collection and re-indexes all knowledge base documents.
"""

import os
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKEND_DIR = os.path.join(BASE_DIR, "backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app.services.document_loader import ingest_knowledge_directory

def main():
    kb_dir = os.path.join(BASE_DIR, "knowledge_base")
    print("=" * 65)
    print(" VaxAssist AI - Rebuilding ChromaDB Vector Collection")
    print("=" * 65)
    print("Dropping existing collection and re-indexing all documents from scratch...")
    
    result = ingest_knowledge_directory(base_dir=kb_dir, reset=True)
    
    print("\nRebuild Result:")
    print(f"  * Files Re-indexed: {result['total_files']}")
    print(f"  * Total Vectors Ingested: {result['total_chunks']}")
    print(f"  * Current ChromaDB Collection Count: {result['collection_count']}")
    print("=" * 65)
    print(" Rebuild Complete!")

if __name__ == "__main__":
    main()
