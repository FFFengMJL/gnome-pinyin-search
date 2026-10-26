#!/usr/bin/env bash
# SPDX-License-Identifier: MIT
# Regenerate pinyin-table.json from pinyin-data.
#
# The table is pinned to a pinyin-data release so the generated file is
# reproducible. Override with PINYIN_DATA_REF=master (or another tag).
set -euo pipefail

ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
REF="${PINYIN_DATA_REF:-v0.15.0}"
URL="https://raw.githubusercontent.com/mozillazg/pinyin-data/${REF}/pinyin.txt"
TMP="$(mktemp)"
trap 'rm -f -- "$TMP"' EXIT

echo "Downloading pinyin-data ${REF}..."
curl -fsSL --retry 3 --retry-delay 2 "$URL" -o "$TMP"

python3 "$ROOT/tools/build_table.py" "$TMP" -o "$ROOT/pinyin-table.json"
