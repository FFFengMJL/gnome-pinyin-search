# Design

This document describes how Pinyin App Search is put together, what it assumes
about GNOME Shell, and why the project uses a small generated pinyin table
instead of a general-purpose library.

## Problem

GNOME Shell's application search is implemented by `AppSearchProvider` in
`js/ui/appDisplay.js`. Its `getInitialResultSet()` method calls
`Shell.AppSystem.search(query)`, which is a thin wrapper around GLib's
`g_desktop_app_info_search()`.

GLib matches the query against application names, generic names, keywords, and
executables. It does not transliterate Han characters to pinyin. As a result,
the Chinese application name 设置 is found by typing `设置`, but not by typing
`shezhi`.

GNOME Shell does not expose a public extension API for adding results to the
built-in application provider. The extension therefore patches the provider's
prototype while it is enabled.

## Architecture

```mermaid
flowchart LR
    A[Overview search] --> B[AppSearchProvider.getInitialResultSet]
    B --> C[Native GLib results]
    B --> D[Pinyin index]
    D --> E[DP matcher]
    C --> F[Merge and dedupe]
    E --> F
    F --> G[Applications section]
```

Components:

| File | Responsibility |
| --- | --- |
| `extension.js` | Load the table, build the app index, patch `AppSearchProvider`, merge results. |
| `lib/pinyin.js` | Normalize queries, turn names into syllable units, run the dynamic-programming matcher. |
| `pinyin-table.json` | Generated Han character to pinyin readings, loaded once at enable time. |
| `tools/build_table.py` | Generate the table from `pinyin-data`. |
| `test/test-pinyin.js` | Matcher tests that run outside GNOME Shell. |

### Patching the provider

`AppDisplay.AppSearchProvider.prototype.getInitialResultSet` is replaced with a
function that:

1. Calls the original method and keeps its result array.
2. If the query is at least two ASCII letters or digits, searches the pinyin
   index.
3. Merges the pinyin result IDs with the native results, de-duplicates them,
   and returns the combined array.

The original method is restored in `disable()`. The wrapper checks that the
prototype still points at its own patch before restoring it, so it does not
clobber another extension that patched the provider later.

`AppSearchProvider.getSubsearchResultSet()` calls `this.getInitialResultSet()`,
so incremental typing automatically goes through the patched path.

## Matching algorithm

### Normalization

A query is normalized with `normalizeQuery()`:

- NFKC normalization, lower-casing.
- `ü` / `ǖ` / `ǘ` / `ǚ` / `ǜ` become `v`.
- Tone marks are stripped after NFD decomposition.
- Spaces, punctuation, and apostrophes are removed, so `she zhi`, `she-zhi`,
  and `Shè Zhì` all become `shezhi`.

Queries that are not pure ASCII letters/digits after normalization are left to
the native provider.

### Units

Each application name is converted into a list of units:

- A Han character with table readings becomes one unit with all of its
  readings (`乐` -> `["le", "yue"]`).
- ASCII letters and digits become one unit per character, so names such as
  `QQ音乐` can be matched from the Han part.
- Spaces and punctuation are ignored.

Only names containing at least one Han character are indexed. English-only
applications are already covered by the native provider.

### Dynamic programming

`matchUnits(query, units)` checks whether the query is a contiguous sequence of
syllable prefixes. For every unit it can consume 1..N characters of one of its
readings, but it must consume at least one character. The last unit may stop in
the middle of a syllable; intermediate units may also stop early, which is what
makes `ruji` (ru + ji) match 软件 (`ruanjian`).

Each partial syllable adds 1 to the cost. Starting after the first unit adds 1
as well, so matches at the beginning of a name rank above matches in the
middle. Lower cost means a stronger match.

Examples:

| Query | Name | Cost | Reason |
| --- | --- | --- | --- |
| `shezhi` | 设置 | 0 | Both syllables fully consumed. |
| `shezh` | 设置 | 1 | Last syllable is a prefix. |
| `sz` | 设置 | 2 | Two initials, each partial. |
| `ruanj` | 软件 | 1 | Last syllable is a prefix. |
| `ruji` | 软件 | 2 | Two partial syllables. |
| `yinyue` | QQ音乐 | 1 | Match starts at character 3. |

### Merging results

For an ASCII query with at least two characters:

- matches with cost <= 1 are considered strong and are placed before the
  native results;
- native results come next;
- weaker matches are appended.

IDs are de-duplicated. The provider's own result cap still applies after the
merge (GNOME Shell displays at most six application results). Index entries are
dropped if `Shell.AppSystem.lookup_app()` no longer finds them, which protects
against an application disappearing between index rebuilds.

The index is rebuilt lazily when `Shell.AppSystem` emits `installed-changed`.

## Pinyin table

`pinyin-table.json` is generated from
[mozillazg/pinyin-data](https://github.com/mozillazg/pinyin-data) tag
`v0.15.0`:

- CJK Unified Ideographs, Extension A, Compatibility Ideographs, and 〇.
- 26,714 characters, about 345 KiB.
- Tone marks are stripped; readings are stored without tones.
- `ü` is stored as `v`, and a `u` variant is added so both `lv` and `lu` work.
- Multiple readings are joined with `|`, for example `"重": "zhong|chong|tong"`.

The table is checked in so installing the extension does not require Python,
network access, or a build step. Regenerate it with `make table`.

The table covers every Han character in the Chinese application names observed
on the development machine (Fedora 44, 109 names at the time of writing). A
character outside the table cannot be matched through pinyin, but the native
provider still matches the name itself.

## Why not pinyin-pro?

[pinyin-pro](https://github.com/zh-lx/pinyin-pro) was evaluated as a
general-purpose alternative (version 3.29.5, MIT):

- Its ESM entry bundles to a single ~310 KiB file. The bundle imports and runs
  under GJS 1.88 and inside a GNOME Shell 50.6 headless instance.
- `pinyin()` provides phrase-aware readings (`重庆银行音乐` ->
  `chong qing yin hang yin yue`).
- `match(text, query, options)` handles initials, partial syllables, and
  polyphonic characters. To reproduce this project's behaviour it needs:

  ```js
  {
      precision: 'start',
      lastPrecision: 'start',
      continuous: true,
      space: 'ignore',
      v: true,
  }
  ```

- `match()` returns the matched character indices (for example `[0, 1]`), not
  a relevance score. The extension still needs a wrapper for strong/weak
  ordering, for example by checking full-pinyin and initials prefixes and
  using the first matched index.
- `match()` does not strip tone marks from the query; the existing
  `normalizeQuery()` step would still be needed.
- GNOME Shell extensions cannot import npm packages at runtime. The bundle
  would have to be vendored and regenerated with Bun or esbuild.

The current implementation was kept dependency-free: the generated table is a
little larger than the pinyin-pro bundle, the matcher is small and fully
controllable, and installing the extension requires no build tooling. The
trade-off is that the table and the polyphonic data are project-maintained. If
the matching data becomes a maintenance burden, swapping in pinyin-pro is a
contained change: vendor the bundle, load the table from `polyphonic()`, and
keep the merge/scoring layer.

## Constraints

- **Application search only.** The extension does not touch remote providers
  such as Settings, Files, or Calculator.
- **Private API.** The provider patch is not covered by GNOME's extension API
  stability guarantees. Every GNOME Shell major release needs a smoke test.
- **No phrase disambiguation.** The matcher considers all readings of each
  character, so it can over-match. This is intentional: `zhongqing` should
  find 重庆 even though the primary reading is `chongqing`.
- **Query language.** Only ASCII queries are sent to the pinyin matcher; Chinese
  queries continue to use the native provider.
