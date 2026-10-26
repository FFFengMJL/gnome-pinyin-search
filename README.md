# Pinyin App Search

[![GNOME Shell](https://img.shields.io/badge/GNOME%20Shell-48--50-blue)](#compatibility)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![CI](https://github.com/FFFengMJL/gnome-pinyin-search/actions/workflows/ci.yml/badge.svg)](https://github.com/FFFengMJL/gnome-pinyin-search/actions/workflows/ci.yml)

[简体中文](README.zh-CN.md)

A GNOME Shell extension that adds pinyin matching to application search in the
overview. Type `shezhi` for 设置, `wangyi` for 网易云音乐, or `jsq` for 计算器;
results appear in the normal Applications section and keep their icons and
launch behaviour.

> **Status:** early release, install from source. Not on extensions.gnome.org yet.

## Features

- Full pinyin, initials, partial syllables, and mixed input
  (`shezhi`, `sz`, `shezh`, `ruji`, `rj`).
- All readings of polyphonic characters are considered
  (`chongqing` and `zhongqing` both find 重庆).
- Names that mix Chinese and Latin characters work too
  (`yinyue` finds QQ音乐).
- The index is rebuilt when applications are installed or removed.
- No `.desktop` files are modified and no root access is required.

## Compatibility

- GNOME Shell 48, 49, 50.
- Tested on GNOME Shell 50.6, Fedora 44, Wayland, GJS 1.88.
- GNOME 48/49 are expected to work but have not been tested manually.

The extension patches an internal GNOME Shell API. See
[Design](docs/design.md) for details and limitations.

## Install

```bash
git clone https://github.com/FFFengMJL/gnome-pinyin-search.git
cd gnome-pinyin-search
./install.sh

# GNOME Shell only scans new extensions at login.
# Log out and back in once, then enable it:
gnome-extensions enable pinyin-app-search@fffengmjl.github.io
gnome-extensions info pinyin-app-search@fffengmjl.github.io   # State: ACTIVE
```

You can also enable "Pinyin App Search" in the Extensions app after logging
back in. After the first login, enabling and disabling takes effect
immediately.

To remove it:

```bash
./uninstall.sh
```

## Usage

Press Super and type:

| Query | Matches |
| --- | --- |
| `shezhi` | 设置 |
| `sz` | 设置, 时钟 |
| `wangyi` | 网易云音乐 |
| `wyyyy` | 网易云音乐 (initials) |
| `jsq` | 计算器 |
| `ruanj`, `ruji` | 软件 (if installed) |

Results depend on the applications installed on your system.

## How it works

GNOME Shell's application search delegates to GLib's
`g_desktop_app_info_search()`, which matches names, generic names, keywords, and
executables, but does not transliterate Han characters to pinyin. This
extension wraps the internal `AppSearchProvider` and merges pinyin matches into
its result list.

The matching data is a compact Han-to-pinyin table (26,714 characters, about
345 KiB) generated from [pinyin-data](https://github.com/mozillazg/pinyin-data).
A small dynamic-programming matcher scores full pinyin, initials, partial
syllables, and matches that start in the middle of a name.

See [docs/design.md](docs/design.md) for the architecture and scoring rules.

## Limitations

- **Applications only.** The Settings panel provider, Files, Calculator, and
  other overview search providers are not changed. For example, `wangluo`
  will not find the Network settings panel.
- **Private API.** The extension patches
  `AppSearchProvider.prototype.getInitialResultSet`; a future GNOME Shell
  release may change it.
- **Polyphonic characters** are matched using every reading, not phrase-level
  disambiguation. A query can occasionally match more applications than
  expected.
- Only application names are indexed. Native search still handles `.desktop`
  `Keywords`.

## Development

Requirements: `gjs`, `python3`, and `curl`. `gnome-extensions` is only needed
to enable the extension after installation.

```bash
make test     # pinyin matcher unit tests
make check    # tests + JSON/table validation
make table    # regenerate pinyin-table.json (network)
make pack     # build dist/pinyin-app-search@fffengmjl.github.io.shell-extension.zip
make install  # copy to ~/.local/share/gnome-shell/extensions
```

The table is generated from the pinned `pinyin-data` tag `v0.15.0`. The
generator lives in [tools/build_table.py](tools/build_table.py); the updater
uses [tools/update-table.sh](tools/update-table.sh).

Repository layout:

```text
extension.js          GNOME Shell extension entry point
lib/pinyin.js         pure-JS normalizer and DP matcher
pinyin-table.json     generated Han -> pinyin table
tools/                table generator/updater
test/                 gjs matcher tests
docs/                 design notes
AGENTS.md             repository guidance for coding agents
```

See [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

## Alternatives

If you only need pinyin for one or two applications, you can avoid an extension
altogether: GLib's search reads the `Keywords=` field of `.desktop` files.
Copy the system file to `~/.local/share/applications/` and append
`Keywords=shezhi;sz;`. The downside is that the shadow copy can become stale
when the application is updated.

[pinyin-pro](https://github.com/zh-lx/pinyin-pro) was evaluated as a matching
backend. It bundles to about 310 KiB and its `match()` API handles full pinyin,
initials, and partial syllables, but it returns matched indices rather than a
relevance score and requires a bundling step. The current implementation keeps
the extension dependency-free and controls the ranking directly; see
[Design](docs/design.md#why-not-pinyin-pro) for the comparison.

## AI assistance

The initial implementation, tests, and documentation were produced with AI
coding assistance and are maintained by a human maintainer. AI-assisted
contributions are welcome; disclose the assistance in the pull request and
include the tests you ran. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Credits

- Pinyin data: [mozillazg/pinyin-data](https://github.com/mozillazg/pinyin-data) (MIT).
- GNOME Shell internals: the `AppSearchProvider` interface, which is not a
  public extension API.

See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for the pinyin-data
license text.

## License

[MIT](LICENSE)

## Built with

[![](https://img.shields.io/badge/powered_by-dsh-4D6BFE?style=flat-square&logo=deepseek&logoColor=white)](https://github.com/deepseek-ai/deepseek-harness)
