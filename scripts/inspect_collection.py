#!/usr/bin/env python3
"""
VaxAssist AI - Inspect Collection Script
Displays statistics, chunk count, topics, organizations, and sample metadata from ChromaDB.
"""

import os
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKEND_DIR = os.path.join(BASE_DIR, "backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app.db.chroma import chroma_db, KNOWLEDGE_COLLECTION_NAME

def main():
    print("=" * 65)
    print(" VaxAssist AI - ChromaDB Collection Inspection Tool")
    print("=" * 65)

    client = chroma_db.get_client()
    try:
        collection = chroma_db.get_or_create_knowledge_collection(reset=False)
        count = collection.count()
        print(f"Collection Name: {KNOWLEDGE_COLLECTION_NAME}")
        print(f"Total Vectors/Chunks: {count}")
        print("-" * 65)

        if count == 0:
            print("[INFO] Collection is empty. Run 'python scripts/ingest_knowledge.py' to ingest documents.")
            return

        sample = collection.get(limit=10, include=["documents", "metadatas"])
        
        print(f"\nSample Indexed Chunks (Showing up to {min(5, count)}):")
        for i, (cid, doc, meta) in enumerate(zip(sample["ids"][:5], sample["documents"][:5], sample["metadatas"][:5])):
            print(f"\n[{i+1}] ID: {cid}")
            print(f"    Title:        {meta.get('title')}")
            print(f"    Topic:        {meta.get('vaccine_topic')}")
            print(f"    Section:      {meta.get('page_section')}")
            print(f"    Organization: {meta.get('organization')}")
            print(f"    Source File:  {meta.get('source_file')}")
            preview = doc[:160].replace("\n", " ") + ("..." if len(doc) > 160 else "")
            print(f"    Text Preview: {preview}")

        # Unique Topics breakdown
        full_get = collection.get(include=["metadatas"])
        all_topics = {}
        for m in full_get["metadatas"]:
            t = m.get("vaccine_topic", "Unknown")
            all_topics[t] = all_topics.get(t, 0) + 1

        print("\n" + "-" * 65)
        print("Topic Distribution:")
        for topic, topic_count in sorted(all_topics.items(), key=lambda x: x[1], reverse=True):
            print(f"  * {topic}: {topic_count} chunks")

    except Exception as e:
        print(f"[ERROR] Failed to inspect collection: {e}")

    print("=" * 65)

if __name__ == "__main__":
    main()
