#!/usr/bin/env python3

from __future__ import annotations

import argparse
import ast
import difflib
import json
import re
import sys
from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

FRONTMATTER_BOUNDARY = re.compile(r"^---\s*$", re.MULTILINE)
KEY_VALUE_RE = re.compile(r"^([A-Za-z0-9_-]+):\s*(.*)$")
LIST_ITEM_RE = re.compile(r"^\s*\-\s+(.*)$")
TARGET_FIELDS = ("tags", "categories")


@dataclass(frozen=True)
class ValueOccurrence:
    value: str
    file: str


@dataclass
class FileRecord:
    path: Path
    relpath: str
    text: str
    frontmatter: str | None
    parsed: dict[str, object]


class UnionFind:
    def __init__(self) -> None:
        self.parent: dict[str, str] = {}

    def add(self, value: str) -> None:
        self.parent.setdefault(value, value)

    def find(self, value: str) -> str:
        parent = self.parent.setdefault(value, value)
        if parent != value:
            self.parent[value] = self.find(parent)
        return self.parent[value]

    def union(self, left: str, right: str) -> None:
        left_root = self.find(left)
        right_root = self.find(right)
        if left_root != right_root:
            self.parent[right_root] = left_root

    def groups(self) -> list[list[str]]:
        grouped: dict[str, list[str]] = defaultdict(list)
        for value in self.parent:
            grouped[self.find(value)].append(value)
        return list(grouped.values())


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Scan MDX frontmatter for tags/categories and report normalization and similarity candidates."
        )
    )
    parser.add_argument(
        "root",
        nargs="?",
        default="src",
        help="Directory to scan recursively for .mdx files (default: src)",
    )
    parser.add_argument(
        "--threshold",
        type=float,
        default=0.82,
        help="Similarity threshold from 0 to 1 for near-duplicate detection (default: 0.82)",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Emit machine-readable JSON instead of text",
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Interactively choose canonical values and rewrite matching frontmatter entries",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    root = Path(args.root).resolve()
    mdx_files = sorted(root.rglob("*.mdx"))
    file_records: list[FileRecord] = []

    field_occurrences: dict[str, list[ValueOccurrence]] = {field: [] for field in TARGET_FIELDS}
    files_without_frontmatter: list[str] = []

    for path in mdx_files:
        text = path.read_text(encoding="utf-8")
        frontmatter = extract_frontmatter(text)
        relpath = path.relative_to(Path.cwd()).as_posix() if path.is_relative_to(Path.cwd()) else path.as_posix()
        parsed = parse_frontmatter(frontmatter) if frontmatter is not None else {}
        file_records.append(FileRecord(path=path, relpath=relpath, text=text, frontmatter=frontmatter, parsed=parsed))

        if frontmatter is None:
            files_without_frontmatter.append(relpath)
            continue

        for field in TARGET_FIELDS:
            for value in ensure_list(parsed.get(field)):
                if isinstance(value, str) and value.strip():
                    field_occurrences[field].append(ValueOccurrence(value=value.strip(), file=relpath))

    report = {
        "root": root.as_posix(),
        "files_scanned": len(mdx_files),
        "files_without_frontmatter": files_without_frontmatter,
        "fields": {},
    }

    for field, occurrences in field_occurrences.items():
        report["fields"][field] = build_field_report(occurrences, args.threshold)

    if args.apply:
        changed_files = apply_normalization(file_records, report, args.threshold)
        print(f"Updated {changed_files} file(s).")
        return 0

    if args.json:
        json.dump(report, sys.stdout, indent=2)
        sys.stdout.write("\n")
    else:
        print_text_report(report)

    return 0


def extract_frontmatter(text: str) -> str | None:
    matches = list(FRONTMATTER_BOUNDARY.finditer(text))
    if len(matches) < 2 or matches[0].start() != 0:
        return None
    return text[matches[0].end() : matches[1].start()].strip("\n")


def split_frontmatter(text: str) -> tuple[str, str, str] | None:
    matches = list(FRONTMATTER_BOUNDARY.finditer(text))
    if len(matches) < 2 or matches[0].start() != 0:
        return None
    return (
        text[: matches[0].end()],
        text[matches[0].end() : matches[1].start()],
        text[matches[1].start() :],
    )


def parse_frontmatter(frontmatter: str | None) -> dict[str, object]:
    if frontmatter is None:
        return {}

    result: dict[str, object] = {}
    lines = frontmatter.splitlines()
    i = 0

    while i < len(lines):
        line = lines[i]
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            i += 1
            continue

        match = KEY_VALUE_RE.match(line)
        if not match:
            i += 1
            continue

        key, raw_value = match.groups()
        raw_value = raw_value.strip()

        if raw_value == "":
            items: list[str] = []
            j = i + 1
            while j < len(lines):
                item_match = LIST_ITEM_RE.match(lines[j])
                if not item_match:
                    break
                items.append(unquote(item_match.group(1).strip()))
                j += 1
            result[key] = items
            i = j
            continue

        if raw_value.startswith("[") and raw_value.endswith("]"):
            result[key] = parse_inline_list(raw_value)
        else:
            result[key] = parse_scalar(raw_value)
        i += 1

    return result


def parse_inline_list(raw: str) -> list[str]:
    try:
        parsed = ast.literal_eval(raw)
    except (SyntaxError, ValueError):
        inner = raw[1:-1].strip()
        if not inner:
            return []
        return [unquote(part.strip()) for part in inner.split(",") if part.strip()]
    if not isinstance(parsed, list):
        return []
    return [str(item).strip() for item in parsed if str(item).strip()]


def parse_scalar(raw: str) -> object:
    if raw in {"true", "false"}:
        return raw == "true"
    if raw in {"null", "~"}:
        return None
    return unquote(raw)


def unquote(value: str) -> str:
    if len(value) >= 2 and value[0] == value[-1] and value[0] in {'"', "'"}:
        return value[1:-1]
    return value


def ensure_list(value: object) -> Iterable[object]:
    if isinstance(value, list):
        return value
    return ()


def normalize(value: str) -> str:
    normalized = value.strip().lower()
    normalized = normalized.replace("–", "-").replace("—", "-")
    normalized = normalized.replace("“", '"').replace("”", '"')
    normalized = normalized.replace("’", "'").replace("‘", "'")
    normalized = re.sub(r"\s+", " ", normalized)
    return normalized


def similarity(a: str, b: str) -> float:
    return difflib.SequenceMatcher(a=a, b=b).ratio()


def build_field_report(occurrences: list[ValueOccurrence], threshold: float) -> dict[str, object]:
    raw_counts = Counter(item.value for item in occurrences)
    raw_files: dict[str, list[str]] = defaultdict(list)
    normalized_groups: dict[str, set[str]] = defaultdict(set)

    for item in occurrences:
        raw_files[item.value].append(item.file)
        normalized_groups[normalize(item.value)].add(item.value)

    normalization_candidates = []
    for normalized_value, variants in sorted(normalized_groups.items()):
        if len(variants) < 2:
            continue
        normalization_candidates.append(
            {
                "normalized": normalized_value,
                "variants": [
                    {
                        "value": variant,
                        "count": raw_counts[variant],
                        "files": sorted(raw_files[variant]),
                    }
                    for variant in sorted(variants)
                ],
            }
        )

    normalized_values = sorted(normalized_groups)
    similar_pairs = []
    for index, left in enumerate(normalized_values):
        for right in normalized_values[index + 1 :]:
            score = similarity(left, right)
            if score < threshold:
                continue
            similar_pairs.append(
                {
                    "score": round(score, 3),
                    "left": {
                        "normalized": left,
                        "variants": sorted(normalized_groups[left]),
                    },
                    "right": {
                        "normalized": right,
                        "variants": sorted(normalized_groups[right]),
                    },
                }
            )

    similar_pairs.sort(key=lambda item: (-item["score"], item["left"]["normalized"], item["right"]["normalized"]))

    return {
        "unique_values": len(raw_counts),
        "total_occurrences": len(occurrences),
        "top_values": [
            {
                "value": value,
                "count": count,
                "files": sorted(raw_files[value]),
            }
            for value, count in raw_counts.most_common()
        ],
        "normalization_candidates": normalization_candidates,
        "similar_pairs": similar_pairs,
    }


def build_clusters(field_report: dict[str, object]) -> list[list[str]]:
    union_find = UnionFind()

    for candidate in field_report["normalization_candidates"]:
        variants = [variant["value"] for variant in candidate["variants"]]
        for variant in variants:
            union_find.add(variant)
        for variant in variants[1:]:
            union_find.union(variants[0], variant)

    for pair in field_report["similar_pairs"]:
        left_variants = pair["left"]["variants"]
        right_variants = pair["right"]["variants"]
        for variant in left_variants + right_variants:
            union_find.add(variant)
        union_find.union(left_variants[0], right_variants[0])

    clusters = [sorted(group, key=str.lower) for group in union_find.groups() if len(group) > 1]
    clusters.sort(key=lambda group: [value.lower() for value in group])
    return clusters


def apply_normalization(file_records: list[FileRecord], report: dict[str, object], threshold: float) -> int:
    del threshold  # accounted for while building the report
    replacements_by_field: dict[str, dict[str, str]] = {field: {} for field in TARGET_FIELDS}

    for field in TARGET_FIELDS:
        field_report = report["fields"][field]
        raw_counts = {item["value"]: item["count"] for item in field_report["top_values"]}
        clusters = build_clusters(field_report)
        if not clusters:
            continue

        print(f"\nInteractive normalization for {field}:")
        for cluster in clusters:
            canonical = prompt_for_canonical(field, cluster, raw_counts)
            if canonical is None:
                continue
            for variant in cluster:
                if variant != canonical:
                    replacements_by_field[field][variant] = canonical

    changed_files = 0
    for record in file_records:
        updated_text = rewrite_file(record.text, replacements_by_field)
        if updated_text != record.text:
            record.path.write_text(updated_text, encoding="utf-8")
            changed_files += 1

    return changed_files


def prompt_for_canonical(field: str, cluster: list[str], raw_counts: dict[str, int]) -> str | None:
    ranked = sorted(cluster, key=lambda value: (-raw_counts.get(value, 0), value.lower(), value))
    default = ranked[0]

    print(f"\n{field} candidates:")
    for index, value in enumerate(ranked, start=1):
        marker = " (default)" if value == default else ""
        print(f"  {index}. {value} [{raw_counts.get(value, 0)}]{marker}")
    print("  s. skip this group")
    print("  c. enter a custom canonical value")

    while True:
        try:
            response = input(f"Choose canonical value for {field} [{default}]: ").strip()
        except EOFError:
            raise SystemExit("Input ended before normalization choices were complete; no files were changed.")
        if not response:
            return default
        if response.lower() == "s":
            return None
        if response.lower() == "c":
            try:
                custom = input("Enter canonical value: ").strip()
            except EOFError:
                raise SystemExit("Input ended before normalization choices were complete; no files were changed.")
            if custom:
                return custom
            print("Canonical value cannot be empty.")
            continue
        if response.isdigit():
            index = int(response)
            if 1 <= index <= len(ranked):
                return ranked[index - 1]
        print("Enter a number, 's', 'c', or press Enter for the default.")


def rewrite_file(text: str, replacements_by_field: dict[str, dict[str, str]]) -> str:
    split = split_frontmatter(text)
    if split is None:
        return text

    opening, frontmatter_body, remainder = split
    updated_frontmatter = rewrite_frontmatter(frontmatter_body, replacements_by_field)
    return f"{opening}{updated_frontmatter}{remainder}"


def rewrite_frontmatter(frontmatter: str, replacements_by_field: dict[str, dict[str, str]]) -> str:
    lines = frontmatter.splitlines()
    new_lines: list[str] = []
    i = 0

    while i < len(lines):
        line = lines[i]
        match = KEY_VALUE_RE.match(line)
        if not match:
            new_lines.append(line)
            i += 1
            continue

        key, raw_value = match.groups()
        if key not in TARGET_FIELDS:
            new_lines.append(line)
            i += 1
            continue

        replacements = replacements_by_field[key]
        raw_value = raw_value.strip()
        if raw_value == "":
            items: list[str] = []
            j = i + 1
            while j < len(lines):
                item_match = LIST_ITEM_RE.match(lines[j])
                if not item_match:
                    break
                items.append(unquote(item_match.group(1).strip()))
                j += 1
            new_lines.extend(render_list_field(key, [replacements.get(item, item) for item in items]))
            i = j
            continue

        if raw_value.startswith("[") and raw_value.endswith("]"):
            items = parse_inline_list(raw_value)
            new_lines.extend(render_list_field(key, [replacements.get(item, item) for item in items]))
            i += 1
            continue

        new_lines.append(line)
        i += 1

    trailing_newline = "\n" if frontmatter.endswith("\n") else ""
    return "\n".join(new_lines) + trailing_newline


def render_list_field(key: str, values: list[str]) -> list[str]:
    deduped: list[str] = []
    seen: set[str] = set()
    for value in values:
        if value in seen:
            continue
        seen.add(value)
        deduped.append(value)

    if not deduped:
        return [f"{key}: []"]
    return [f"{key}:", *[f"  - {value}" for value in deduped]]


def print_text_report(report: dict[str, object]) -> None:
    print("MDX frontmatter normalization report")
    print(f"Root: {report['root']}")
    print(f"Files scanned: {report['files_scanned']}")
    missing = report["files_without_frontmatter"]
    print(f"Files without frontmatter: {len(missing)}")
    if missing:
        for path in missing:
            print(f"  - {path}")

    for field in TARGET_FIELDS:
        field_report = report["fields"][field]
        print()
        print(f"## {field}")
        print(f"Total occurrences: {field_report['total_occurrences']}")
        print(f"Unique values: {field_report['unique_values']}")

        print("Top values:")
        top_values = field_report["top_values"][:20]
        if not top_values:
            print("  (none)")
        for item in top_values:
            print(f"  - {item['value']} ({item['count']})")

        print("Normalization candidates:")
        normalization_candidates = field_report["normalization_candidates"]
        if not normalization_candidates:
            print("  (none)")
        for candidate in normalization_candidates:
            variants = ", ".join(
                f"{variant['value']} ({variant['count']})" for variant in candidate["variants"]
            )
            print(f"  - {candidate['normalized']}: {variants}")

        print("Similar values:")
        similar_pairs = field_report["similar_pairs"][:30]
        if not similar_pairs:
            print("  (none)")
        for pair in similar_pairs:
            left = "/".join(pair["left"]["variants"])
            right = "/".join(pair["right"]["variants"])
            print(f"  - {pair['score']:.3f}: {left}  <->  {right}")


if __name__ == "__main__":
    raise SystemExit(main())
