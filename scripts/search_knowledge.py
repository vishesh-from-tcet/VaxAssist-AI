#!/usr/bin/env python3
"""
VaxAssist AI - Search / Test Retrieval CLI Tool
Queries ChromaDB knowledge collection and displays matching chunks with metadata & similarity scores.
"""

import os
import sys
import argparse

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKEND_DIR = os.path.join(BASE_DIR, "backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app.services.rag_retriever import rag_retriever

def main():
    parser = argparse.ArgumentParser(description="Query VaxAssist RAG Knowledge Base")
    parser.add_argument("query", nargs="?", default="What is the recommended age for BCG vaccine?", help="Search query")
    parser.add_argument("--top_k", type=int, default=3, help="Number of results to retrieve (default: 3)")
    parser.add_argument("--topic", type=str, default=None, help="Filter by vaccine topic")
    parser.add_argument("--region", type=str, default=None, help="Filter by country/region")

    args = parser.parse_args()

    print("=" * 65)
    print(" VaxAssist AI - Semantic Knowledge Retrieval")
    print("=" * 65)
    print(f"Query: \"{args.query}\"")
    print(f"Top K: {args.top_k}")
    if args.topic:
        print(f"Topic Filter: {args.topic}")
    print("-" * 65)

    res = rag_retriever.retrieve(
        query=args.query,
        top_k=args.top_k,
        vaccine_topic=args.topic,
        country_region=args.region
    )

    print(f"Total Results: {res['total_results']}\n")

    if res['total_results'] == 0:
        print(f"[NO RESULTS] {res.get('notice', 'No matching knowledge chunks found.')}")
        return

    for i, r in enumerate(res['results']):
        meta = r['metadata']
        print(f"[{i+1}] Score: {r['similarity_score']} (Distance: {r['distance']}) | Rank #{r['rank']}")
        print(f"    Document:     {meta.get('title')}")
        print(f"    Section:      {meta.get('page_section')}")
        print(f"    Topic:        {meta.get('vaccine_topic')}")
        print(f"    Organization: {meta.get('organization')}")
        print(f"    Source:       {meta.get('source')} (Version: {meta.get('document_version')})")
        print(f"    Content:\n{r['text']}")
        print("-" * 65)

if __name__ == "__main__":
    main()
