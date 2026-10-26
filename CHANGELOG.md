# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.1.0] - 2026-10-26

### Added

- Pinyin matching for application search in the GNOME Shell overview.
- Full pinyin, initials, partial syllables, and mixed input.
- Polyphonic character support by matching every reading.
- Generated 26,714-character pinyin table from pinyin-data v0.15.0.
- Automatic index rebuild when applications are installed or removed.
- `install.sh`, `uninstall.sh`, Makefile targets, and matcher tests.
- Portable Python zip packaging that does not require `gnome-extensions`.
- Initial public repository documentation and CI.
