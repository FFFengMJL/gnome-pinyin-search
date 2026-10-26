#!/usr/bin/env bash
# SPDX-License-Identifier: MIT
# Install the extension into the current user's GNOME Shell extension dir.
set -euo pipefail

UUID="pinyin-app-search@fffengmjl.github.io"
SRC="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
DEST="${XDG_DATA_HOME:-$HOME/.local/share}/gnome-shell/extensions/$UUID"

install -d "$DEST/lib"
install -m 0644 "$SRC/extension.js" "$SRC/metadata.json" \
    "$SRC/pinyin-table.json" "$DEST/"
install -m 0644 "$SRC/lib/pinyin.js" "$DEST/lib/"

echo "Installed to: $DEST"
echo
echo "GNOME Shell only scans new extensions at login. Log out and back in once,"
echo "then enable it with:"
echo
echo "    gnome-extensions enable $UUID"
echo
echo "Or open the Extensions app and enable \"Pinyin App Search\"."
