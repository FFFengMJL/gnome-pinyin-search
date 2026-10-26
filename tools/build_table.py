#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Build the compact Han -> pinyin table used by the extension.

Input is mozillazg/pinyin-data's pinyin.txt. The checked-in table is
generated from the pinned tag v0.15.0:
    https://raw.githubusercontent.com/mozillazg/pinyin-data/v0.15.0/pinyin.txt

Prefer tools/update-table.sh, which downloads that tag and runs this script.

Usage:
    python3 tools/build_table.py /path/to/pinyin.txt -o pinyin-table.json
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import unicodedata
from pathlib import Path

LINE_RE = re.compile(r"^U\+([0-9A-Fa-f]+):\s*(.*?)\s*(?:#.*)?$")

# Ranges that can realistically appear in application names.
RANGES = (
    (0x3007, 0x3007),  # 〇
    (0x3400, 0x4DBF),  # CJK Ext-A
    (0x4E00, 0x9FFF),  # CJK Unified Ideographs
    (0xF900, 0xFAFF),  # CJK Compatibility Ideographs
)

TONE_REPLACEMENTS = {
    "ü": "v",
    "ǖ": "v",
    "ǘ": "v",
    "ǚ": "v",
    "ǜ": "v",
    "ê": "e",
}


def in_ranges(cp: int) -> bool:
    return any(lo <= cp <= hi for lo, hi in RANGES)


def to_ascii(reading: str) -> str:
    """Strip tones and turn everything into [a-z] (ü becomes v)."""
    reading = "".join(TONE_REPLACEMENTS.get(ch, ch) for ch in reading)
    reading = unicodedata.normalize("NFD", reading)
    reading = "".join(ch for ch in reading if not unicodedata.combining(ch))
    reading = reading.lower()
    return re.sub(r"[^a-z]", "", reading)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("input", type=Path, help="pinyin.txt from pinyin-data")
    parser.add_argument(
        "-o",
        "--output",
        type=Path,
        default=Path("pinyin-table.json"),
    )
    args = parser.parse_args()

    table: dict[str, list[str]] = {}
    for raw in args.input.read_text(encoding="utf-8").splitlines():
        raw = raw.strip()
        if not raw or raw.startswith("#"):
            continue
        match = LINE_RE.match(raw)
        if not match:
            continue
        cp = int(match.group(1), 16)
        if not in_ranges(cp):
            continue
        ch = chr(cp)
        readings: list[str] = []
        for part in match.group(2).split(","):
            ascii_reading = to_ascii(part)
            if not ascii_reading:
                continue
            readings.append(ascii_reading)
            # Many users type "lu" instead of "lv"; accept both spellings.
            if "v" in ascii_reading:
                readings.append(ascii_reading.replace("v", "u"))
        if not readings:
            continue
        # Keep insertion order but drop duplicates.
        table[ch] = list(dict.fromkeys(readings))

    compact = {ch: "|".join(readings) for ch, readings in table.items()}
    args.output.write_text(
        json.dumps(compact, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    size = args.output.stat().st_size
    print(f"{len(compact)} characters -> {args.output} ({size / 1024:.0f} KiB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
