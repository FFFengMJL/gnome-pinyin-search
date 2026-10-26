#!/usr/bin/env bash
# SPDX-License-Identifier: MIT
# Disable and remove the per-user installation of the extension.
set -euo pipefail

UUID="pinyin-app-search@fffengmjl.github.io"
DEST="${XDG_DATA_HOME:-$HOME/.local/share}/gnome-shell/extensions/$UUID"

if command -v gnome-extensions >/dev/null 2>&1; then
    gnome-extensions disable "$UUID" >/dev/null 2>&1 || true
fi

rm -rf -- "$DEST"

echo "Removed: $DEST"
