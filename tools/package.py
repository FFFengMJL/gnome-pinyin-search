#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Build the extension zip without depending on gnome-extensions.

The archive contains the runtime files at its root, which is the layout
expected by `gnome-extensions install` and extensions.gnome.org.
"""
from __future__ import annotations

import argparse
import json
import zipfile
from pathlib import Path

FILES = (
    "metadata.json",
    "extension.js",
    "lib/pinyin.js",
    "pinyin-table.json",
    "LICENSE",
    "THIRD_PARTY_NOTICES.md",
)
# Fixed timestamp makes the archive reproducible.
DATE_TIME = (1980, 1, 1, 0, 0, 0)


def build(source: Path, out_dir: Path) -> Path:
    metadata = json.loads((source / "metadata.json").read_text(encoding="utf-8"))
    uuid = metadata["uuid"]
    out_dir.mkdir(parents=True, exist_ok=True)
    output = out_dir / f"{uuid}.shell-extension.zip"

    with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for name in FILES:
            path = source / name
            if not path.is_file():
                raise SystemExit(f"missing runtime file: {path}")
            info = zipfile.ZipInfo(name, date_time=DATE_TIME)
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            archive.writestr(info, path.read_bytes())

    return output


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--out-dir",
        default="dist",
        help="output directory (default: dist)",
    )
    args = parser.parse_args()

    source = Path(__file__).resolve().parent.parent
    out_dir = Path(args.out_dir)
    if not out_dir.is_absolute():
        out_dir = source / out_dir
    output = build(source, out_dir)
    size_kib = output.stat().st_size / 1024
    print(f"packed {len(FILES)} files -> {output} ({size_kib:.0f} KiB)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
