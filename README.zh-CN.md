# Pinyin App Search

[![GNOME Shell](https://img.shields.io/badge/GNOME%20Shell-48--50-blue)](#兼容性)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![CI](https://github.com/FFFengMJL/gnome-pinyin-search/actions/workflows/ci.yml/badge.svg)](https://github.com/FFFengMJL/gnome-pinyin-search/actions/workflows/ci.yml)

[English](README.md)

给 GNOME Shell 概览（Super 键）里的**应用搜索**加上拼音匹配的扩展。
输入 `shezhi` 找「设置」，`wangyi` 找「网易云音乐」，`jsq` 找「计算器」；
结果仍显示在正常的应用区域，图标和启动行为不变。

> **状态：** 早期版本，暂未上架 extensions.gnome.org，请从源码安装。

## 功能

- 全拼、首字母、部分音节和混合输入（`shezhi`、`sz`、`shezh`、`ruji`、`rj`）。
- 多音字按所有读音匹配（`chongqing` 和 `zhongqing` 都能找到「重庆」）。
- 支持中英混合的应用名（`yinyue` 能找到「QQ音乐」）。
- 应用安装/卸载后自动重建索引。
- 不修改任何 `.desktop` 文件，不需要 root 权限。

## 兼容性

- GNOME Shell 48、49、50。
- 已在 GNOME Shell 50.6 / Fedora 44 / Wayland / GJS 1.88 上测试。
- 48/49 理论上可用，但未手动测试。

本扩展包装了 GNOME Shell 的内部 API，细节和限制见 [设计文档](docs/design.md)。

## 安装

```bash
git clone https://github.com/FFFengMJL/gnome-pinyin-search.git
cd gnome-pinyin-search
./install.sh

# GNOME Shell 只在登录时扫描新扩展目录。
# 注销并重新登录一次，然后启用：
gnome-extensions enable pinyin-app-search@fffengmjl.github.io
gnome-extensions info pinyin-app-search@fffengmjl.github.io   # State: ACTIVE
```

重新登录后也可以在「扩展」应用里打开 “Pinyin App Search”。
首次发现之后，启用/禁用可以即时生效。

卸载：

```bash
./uninstall.sh
```

## 用法

按 Super，直接输入：

| 输入 | 结果 |
| --- | --- |
| `shezhi` | 设置 |
| `sz` | 设置、时钟 |
| `wangyi` | 网易云音乐 |
| `wyyyy` | 网易云音乐（首字母） |
| `jsq` | 计算器 |
| `ruanj`、`ruji` | 软件（如果已安装） |

实际结果取决于本机安装的应用。

## 实现

GNOME Shell 的应用搜索最终调用 GLib 的 `g_desktop_app_info_search()`，它只匹配
`Name`、`GenericName`、`Keywords`、`Exec` 等字段，不做汉字→拼音转换。本扩展包装
内部的 `AppSearchProvider`，把拼音命中的结果合并进它的结果列表。

匹配数据是一张紧凑的汉字→拼音表（26,714 个汉字，约 345 KiB），由
[pinyin-data](https://github.com/mozillazg/pinyin-data) 生成。一个小的动态规划
匹配器负责打分：全拼、首字母、部分音节，以及从名字中间开始命中的情况。

架构和排序规则见 [docs/design.md](docs/design.md)。

## 限制

- **只覆盖应用搜索。** 设置面板、文件、计算器等概览搜索 provider 不会被修改。
  例如 `wangluo` 不会命中「网络」设置面板。
- **私有 API。** 扩展包装 `AppSearchProvider.prototype.getInitialResultSet`；
  GNOME Shell 未来版本可能改动这个接口。
- **多音字**按所有读音匹配，不做词组消歧，偶尔会多命中一些应用。
- 只索引应用名。`.desktop` 的 `Keywords` 仍由原生搜索处理。

## 开发

依赖：`gjs`、`python3`、`curl`；`gnome-extensions` 只在安装后启用时需要。

```bash
make test     # 拼音匹配单元测试
make check    # 测试 + JSON/拼音表校验
make table    # 重新生成 pinyin-table.json（需要联网）
make pack     # 生成 dist/pinyin-app-search@fffengmjl.github.io.shell-extension.zip
make install  # 复制到 ~/.local/share/gnome-shell/extensions
```

拼音表由固定版本的 `pinyin-data` 标签 `v0.15.0` 生成，生成器在
[tools/build_table.py](tools/build_table.py)，更新脚本在
[tools/update-table.sh](tools/update-table.sh)。

仓库结构：

```text
extension.js          GNOME Shell 扩展入口
lib/pinyin.js         纯 JS 归一化与动态规划匹配器
pinyin-table.json     生成的汉字→拼音表
tools/                拼音表生成/更新脚本
test/                 gjs 匹配测试
docs/                 设计文档
AGENTS.md             面向编码代理的仓库约束
```

提交 PR 前请阅读 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 替代方案

如果只想让一两个应用支持拼音，可以完全不装扩展：GLib 的搜索会读 `.desktop`
的 `Keywords=`。把系统 `.desktop` 复制到 `~/.local/share/applications/`，追加
`Keywords=shezhi;sz;` 即可。缺点是影子文件会随应用升级而过期。

也评估过用 [pinyin-pro](https://github.com/zh-lx/pinyin-pro) 作为匹配后端：它打包后
约 310 KiB，`match()` 支持全拼、首字母和部分音节，但返回的是匹配下标而不是相关度
评分，并且需要额外的打包步骤。当前实现选择零依赖、可控排序的方案；对比见
[设计文档](docs/design.md#why-not-pinyin-pro)。

## AI 辅助说明

本项目的初版代码、测试和文档在 AI 辅助下完成，由人类维护者负责维护。
欢迎 AI 辅助的贡献，但请在 PR 中说明，并附上实际运行过的测试。详见
[CONTRIBUTING.md](CONTRIBUTING.md)。

## 致谢

- 拼音数据：[mozillazg/pinyin-data](https://github.com/mozillazg/pinyin-data)（MIT）。
- GNOME Shell 内部接口：`AppSearchProvider`，它不是公开扩展 API。

pinyin-data 的许可证文本见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

## 许可证

[MIT](LICENSE)

## 构建工具

[![](https://img.shields.io/badge/powered_by-dsh-4D6BFE?style=flat-square&logo=deepseek&logoColor=white)](https://github.com/deepseek-ai/deepseek-harness)
