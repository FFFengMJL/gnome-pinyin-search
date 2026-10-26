# AGENTS.md

Repository-specific guidance for coding agents. Read [README.md](README.md) and
[CONTRIBUTING.md](CONTRIBUTING.md) first; this file only records constraints
that are easy to miss.

## Project

Pinyin App Search is a GNOME Shell extension that adds pinyin matching to the
overview's application search. The runtime is GJS (GNOME JavaScript), not
Node.js.

## Hard constraints

- Target GNOME Shell 48-50 and GJS ESM. Do not add Node.js-only APIs.
- Do not add npm/runtime dependencies. The extension must load from a plain
  directory with `extension.js`, `metadata.json`, `lib/`, and
  `pinyin-table.json`.
- Keep the extension UUID `pinyin-app-search@fffengmjl.github.io`. Changing it
  breaks existing installations and the metadata/README/install scripts.
- `pinyin-table.json` is generated. Never hand-edit it; run `make table` and
  mention the `pinyin-data` ref if the data changes.
- `extension.js` patches the private
  `AppSearchProvider.prototype.getInitialResultSet`. Keep the patch minimal,
  restore it in `disable()`, and do not let pinyin failures break native
  results.
- No network access or file writes at runtime. Reading the bundled table in
  `enable()` is the only file access.
- Do not add secrets, tokens, personal paths, or machine-specific settings.

## Commands

```bash
make test      # pure-JS matcher tests (gjs)
make check     # tests + JSON/table validation
make pack      # build dist/...zip
make table     # regenerate pinyin-table.json (network)
make install   # copy to the user extension dir
```

## Testing

- Add a case to `test/test-pinyin.js` for every matching-rule change.
- Run `make check` before reporting success.
- For provider/merge changes, test in a GNOME Shell 50 session or an isolated
  headless instance; report the exact commands and results.
- Do not claim manual testing you did not perform.

## Style

- Four-space indentation, single quotes, semicolons.
- Keep the diff focused; do not reformat generated files or unrelated code.
- Update README/README.zh-CN/docs/design.md for user-visible changes.
- Update CHANGELOG.md for user-visible changes.

## AI assistance

This repository's initial code, tests, and documentation were produced with AI
coding assistance and are maintained by a human maintainer. AI-assisted
contributions are welcome, but disclose the assistance in the pull request and
include the tests you ran. Agents must report actual command output rather than
assuming success.
