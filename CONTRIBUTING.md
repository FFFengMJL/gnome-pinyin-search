# Contributing

Thanks for taking the time to contribute. This is a small GNOME Shell
extension; focused patches and clear bug reports are welcome.

## Before you start

- Read [README.md](README.md) and [docs/design.md](docs/design.md).
- Check existing issues and pull requests to avoid duplicate work.
- The extension patches a private GNOME Shell API. Changes should keep that
  patch as small and defensive as possible.

## Requirements

- `gjs` (GJS 1.70 or newer; 1.88 was used for development).
- `python3` for the table generator and JSON checks.
- `curl` for regenerating the table.
- `gnome-extensions` from GNOME Shell for enabling the extension after installation.
- A GNOME Shell 48–50 session for manual testing.

On Fedora:

```bash
sudo dnf install gjs python3 curl gnome-shell
```

On Debian/Ubuntu:

```bash
sudo apt install gjs python3 curl gnome-shell
```

## Development workflow

```bash
git clone https://github.com/FFFengMJL/gnome-pinyin-search.git
cd gnome-pinyin-search
make check
```

Install the extension into your user profile:

```bash
make install
# Log out and back in once, then:
gnome-extensions enable pinyin-app-search@fffengmjl.github.io
```

After the first login, code changes can be tested by disabling and re-enabling
the extension:

```bash
gnome-extensions disable pinyin-app-search@fffengmjl.github.io
gnome-extensions enable pinyin-app-search@fffengmjl.github.io
```

Watch the shell log for errors:

```bash
journalctl --user -b -f | grep pinyin-app-search
```

## Tests

- `make test` runs the pure-JS matcher tests with `gjs`. They do not require a
  running GNOME Shell.
- `make check` also validates the JSON files and compiles the table generator.
- Add a test case to `test/test-pinyin.js` for every matching rule you change.
- If you change the table format or generator, regenerate
  `pinyin-table.json` with `make table` and mention it in the pull request.

## Code style

- ES modules, four-space indentation, single quotes, semicolons.
- Do not add Node.js-only APIs or npm runtime dependencies. The extension runs
  inside GNOME Shell's GJS runtime.
- Keep `extension.js` defensive: a broken desktop file or a missing app must
  not break the native search results.
- Prefer small, focused changes over broad refactors.

## Pull requests

- Describe the problem and the approach in the PR body.
- Include manual test details: GNOME Shell version, distribution, and session
  type (Wayland/X11).
- Update `README.md`, `README.zh-CN.md`, or `docs/design.md` when behaviour or
  installation changes.
- Update `CHANGELOG.md` for user-visible changes.
- Do not commit `dist/`, `__pycache__/`, or local extension installations.

## Commit messages

Conventional Commit style is appreciated but not required:

```text
feat: match partial syllables in the middle of a name
fix: keep native results when the pinyin table fails to load
docs: document the GNOME Shell provider patch
```

## AI-assisted contributions

AI-assisted contributions are welcome. If you use a coding agent, also read
[AGENTS.md](AGENTS.md). Disclose the assistant or model in the pull request
description and list the commands you actually ran. You are responsible for
reviewing the generated code and for the final change. Do not submit
unreviewed output.

## Reporting bugs

Use the bug report issue template and include:

- GNOME Shell version (`gnome-shell --version`).
- Distribution and version.
- Session type (Wayland or X11).
- The exact query and the applications that were installed.
- Relevant `journalctl --user -b | grep pinyin-app-search` output.

## License

By contributing, you agree that your contributions are licensed under the
project's [MIT License](LICENSE).
