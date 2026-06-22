#!/usr/bin/env python3
"""Seed Supabase tables from a seed JSON file via PostgREST."""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Dict, Iterable, List
from urllib.parse import urlencode

import requests

TABLE_ORDER = [
    ("regions", "code"),
    ("provinces", "code"),
    ("channels", "code"),
    ("sub_channels", "code"),
    ("categories", "code"),
    ("type_selects", "code"),
    ("price_sources", "code"),
    ("dealers", "code"),
    ("districts", "code"),
    ("brands", "code"),
    ("district_dealers", "district_code,dealer_code"),
]


def _chunk_rows(rows: List[Dict], chunk_size: int) -> Iterable[List[Dict]]:
    for i in range(0, len(rows), chunk_size):
        yield rows[i : i + chunk_size]


def upsert_rows(
    *,
    supabase_url: str,
    service_role_key: str,
    table: str,
    on_conflict: str,
    rows: List[Dict],
    chunk_size: int,
) -> None:
    if not rows:
        print(f"[skip] {table}: no rows")
        return

    headers = {
        "apikey": service_role_key,
        "Authorization": "Bearer " + service_role_key,
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=minimal",
    }

    query = urlencode({"on_conflict": on_conflict})
    url = f"{supabase_url.rstrip('/')}/rest/v1/{table}?{query}"

    inserted = 0
    for chunk in _chunk_rows(rows, chunk_size):
        response = requests.post(url, headers=headers, json=chunk, timeout=30)
        if response.status_code >= 300:
            print(
                f"[error] {table}: HTTP {response.status_code}\n"
                f"URL: {url}\n"
                f"Response: {response.text}",
                file=sys.stderr,
            )
            raise RuntimeError(f"Failed to upsert into '{table}'")
        inserted += len(chunk)

    print(f"[ok] {table}: upserted {inserted} row(s)")


def main() -> int:
    parser = argparse.ArgumentParser(description="Seed Supabase reference tables")
    parser.add_argument("--seed", type=Path, default=Path("seed.json"), help="Path to seed JSON")
    parser.add_argument("--chunk-size", type=int, default=500, help="Rows per request")
    args = parser.parse_args()

    supabase_url = os.environ.get("SUPABASE_URL")
    service_role_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

    if not supabase_url:
        raise EnvironmentError("SUPABASE_URL is required")
    if not service_role_key:
        raise EnvironmentError("SUPABASE_SERVICE_ROLE_KEY is required")

    if not args.seed.exists():
        raise FileNotFoundError(f"Seed file not found: {args.seed}")

    payload = json.loads(args.seed.read_text(encoding="utf-8"))

    for table, conflict_target in TABLE_ORDER:
        rows = payload.get(table, [])
        if not isinstance(rows, list):
            raise ValueError(f"Seed key '{table}' must be a list")
        upsert_rows(
            supabase_url=supabase_url,
            service_role_key=service_role_key,
            table=table,
            on_conflict=conflict_target,
            rows=rows,
            chunk_size=args.chunk_size,
        )

    print("Seeding complete")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
