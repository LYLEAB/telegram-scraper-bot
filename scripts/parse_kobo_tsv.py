#!/usr/bin/env python3
"""Parse Kobo choices TSV and generate normalized seed JSON."""

from __future__ import annotations

import argparse
import csv
import json
from collections import OrderedDict
from pathlib import Path
from typing import Dict, List


def _add_if_present(store: "OrderedDict[str, Dict[str, str]]", code: str, payload: Dict[str, str]) -> None:
    if code:
        store[code] = payload


def parse_choices_tsv(input_path: Path) -> Dict[str, List[Dict[str, str]]]:
    regions: "OrderedDict[str, Dict[str, str]]" = OrderedDict()
    dealers: "OrderedDict[str, Dict[str, str]]" = OrderedDict()
    provinces: "OrderedDict[str, Dict[str, str]]" = OrderedDict()
    districts: "OrderedDict[str, Dict[str, str]]" = OrderedDict()
    channels: "OrderedDict[str, Dict[str, str]]" = OrderedDict()
    sub_channels: "OrderedDict[str, Dict[str, str]]" = OrderedDict()
    categories: "OrderedDict[str, Dict[str, str]]" = OrderedDict()
    brands: "OrderedDict[str, Dict[str, str]]" = OrderedDict()
    type_selects: "OrderedDict[str, Dict[str, str]]" = OrderedDict()
    price_sources: "OrderedDict[str, Dict[str, str]]" = OrderedDict()
    district_dealers = set()

    with input_path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle, delimiter="\t")
        required_cols = {"list_name", "name", "label"}
        if not reader.fieldnames or not required_cols.issubset(set(reader.fieldnames)):
            raise ValueError("TSV must include columns: list_name, name, label")

        for row in reader:
            list_name = (row.get("list_name") or "").strip()
            code = (row.get("name") or "").strip()
            label = (row.get("label") or "").strip()

            if not list_name or not code:
                continue

            if list_name == "region":
                _add_if_present(regions, code, {"code": code, "label": label})
            elif list_name == "dealer":
                _add_if_present(
                    dealers,
                    code,
                    {
                        "code": code,
                        "label": label,
                        "region_code": (row.get("region") or "").strip(),
                    },
                )
            elif list_name == "province":
                _add_if_present(provinces, code, {"code": code, "label": label})
            elif list_name == "district":
                _add_if_present(
                    districts,
                    code,
                    {
                        "code": code,
                        "label": label,
                        "province_code": (row.get("province") or "").strip(),
                    },
                )
                for index in range(1, 10):
                    dealer_code = (row.get(f"dealer{index}") or "").strip()
                    if dealer_code:
                        district_dealers.add((code, dealer_code))
            elif list_name == "channel_select":
                _add_if_present(channels, code, {"code": code, "label": label})
            elif list_name == "sub_channel":
                _add_if_present(sub_channels, code, {"code": code, "label": label})
            elif list_name == "category":
                _add_if_present(categories, code, {"code": code, "label": label})
            elif list_name == "brand":
                _add_if_present(
                    brands,
                    code,
                    {
                        "code": code,
                        "label": label,
                        "category_code": (row.get("cat") or "").strip(),
                    },
                )
            elif list_name == "type_select":
                _add_if_present(type_selects, code, {"code": code, "label": label})
            elif list_name == "price_source":
                _add_if_present(price_sources, code, {"code": code, "label": label})

    return {
        "regions": list(regions.values()),
        "dealers": list(dealers.values()),
        "provinces": list(provinces.values()),
        "districts": list(districts.values()),
        "district_dealers": [
            {"district_code": district_code, "dealer_code": dealer_code}
            for district_code, dealer_code in sorted(district_dealers)
        ],
        "channels": list(channels.values()),
        "sub_channels": list(sub_channels.values()),
        "categories": list(categories.values()),
        "brands": list(brands.values()),
        "type_selects": list(type_selects.values()),
        "price_sources": list(price_sources.values()),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Parse Kobo choices TSV into seed JSON")
    parser.add_argument("input_tsv", type=Path, help="Path to Kobo choices TSV")
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("seed.json"),
        help="Output JSON path (default: ./seed.json)",
    )
    args = parser.parse_args()

    if not args.input_tsv.exists():
        raise FileNotFoundError(f"Input file not found: {args.input_tsv}")

    data = parse_choices_tsv(args.input_tsv)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote seed data to {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
