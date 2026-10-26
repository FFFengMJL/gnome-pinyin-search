// SPDX-License-Identifier: MIT
// Pinyin search for the application grid in the GNOME Shell overview.
//
// GNOME's built-in app search delegates to GLib's
// g_desktop_app_info_search(), which knows about names, generic names,
// keywords and executables, but not about pinyin. This extension wraps the
// internal AppSearchProvider and prepends/appends pinyin matches to its
// result list, so results keep the normal look and activation behaviour.

import Shell from 'gi://Shell';

import * as AppDisplay from 'resource:///org/gnome/shell/ui/appDisplay.js';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

import {buildUnits, matchUnits, normalizeQuery} from './lib/pinyin.js';

const MAX_RESULTS = 8;
// Matches that only consume initials score 1 per character, so cost <= 1
// means "full pinyin or a partial syllable prefix". Those are unambiguous
// enough to rank above GLib's own results; weaker matches follow them.
const STRONG_COST = 1;
const DEBUG = false;

export default class PinyinAppSearch extends Extension {
    enable() {
        this._table = {};
        this._apps = [];
        this._dirty = true;
        this._original = null;
        this._patched = null;
        this._appSystem = Shell.AppSystem.get_default();
        this._usage = Shell.AppUsage.get_default();
        this._installedChangedId = this._appSystem.connect(
            'installed-changed', () => {
                this._dirty = true;
            });

        try {
            this._table = this._loadTable();
            this._rebuild();
        } catch (e) {
            console.error(`[pinyin-app-search] failed to build index: ${e}`);
            this._table = {};
            this._apps = [];
        }

        this._patchProvider();

        if (DEBUG) {
            const sample = this._find('shezhi')
                .slice(0, 3)
                .map(result => result.id)
                .join(', ');
            console.log(
                `[pinyin-app-search] indexed ${this._apps.length} apps; ` +
                `shezhi -> ${sample || '(none)'}`);
        }
    }

    disable() {
        if (this._installedChangedId) {
            this._appSystem.disconnect(this._installedChangedId);
            this._installedChangedId = 0;
        }

        if (this._patched &&
            AppDisplay.AppSearchProvider.prototype.getInitialResultSet ===
                this._patched) {
            AppDisplay.AppSearchProvider.prototype.getInitialResultSet =
                this._original;
        }

        this._patched = null;
        this._original = null;
        this._apps = [];
        this._table = {};
        this._dirty = true;
    }

    _loadTable() {
        const file = this.dir.get_child('pinyin-table.json');
        const [ok, contents] = file.load_contents(null);
        if (!ok)
            throw new Error(`cannot read ${file.get_path()}`);
        return JSON.parse(new TextDecoder('utf-8').decode(contents));
    }

    _rebuild() {
        const apps = [];
        const seen = new Set();

        for (const info of this._appSystem.get_installed()) {
            try {
                const id = info.get_id();
                if (!id || !id.endsWith('.desktop') || seen.has(id))
                    continue;
                if (!info.should_show())
                    continue;

                const name = info.get_name();
                if (!name)
                    continue;

                const units = buildUnits(name, this._table);
                if (!units)
                    continue;

                seen.add(id);
                apps.push({id, name, units});
            } catch (e) {
                // One broken desktop file should not kill the whole index.
                console.debug(`[pinyin-app-search] skipping app: ${e}`);
            }
        }

        this._apps = apps;
        this._dirty = false;
    }

    _find(query) {
        const matches = [];
        for (const app of this._apps) {
            const cost = matchUnits(query, app.units);
            if (cost < Infinity)
                matches.push({id: app.id, name: app.name, cost});
        }

        matches.sort((a, b) => {
            if (a.cost !== b.cost)
                return a.cost - b.cost;
            const usage = this._usage.compare(a.id, b.id);
            if (usage !== 0)
                return usage;
            return a.name.localeCompare(b.name);
        });

        return matches.slice(0, MAX_RESULTS);
    }

    _patchProvider() {
        const prototype = AppDisplay.AppSearchProvider.prototype;
        if (typeof prototype.getInitialResultSet !== 'function') {
            console.error('[pinyin-app-search] AppSearchProvider API changed');
            return;
        }

        this._original = prototype.getInitialResultSet;
        const extension = this;
        this._patched = function (terms, cancellable) {
            return extension._getInitialResultSet(this, terms, cancellable);
        };
        prototype.getInitialResultSet = this._patched;
    }

    async _getInitialResultSet(provider, terms, cancellable) {
        let builtin = [];
        try {
            builtin = await this._original.call(provider, terms, cancellable);
            if (!Array.isArray(builtin))
                builtin = [];
        } catch (e) {
            console.error(`[pinyin-app-search] native search failed: ${e}`);
        }

        if (cancellable?.is_cancelled())
            return builtin;

        const query = normalizeQuery(terms.join(' '));
        if (query.length < 2 || !/^[a-z0-9]+$/.test(query))
            return builtin;

        let matches;
        try {
            if (this._dirty)
                this._rebuild();
            matches = this._find(query);
        } catch (e) {
            console.error(`[pinyin-app-search] pinyin search failed: ${e}`);
            return builtin;
        }

        if (matches.length === 0)
            return builtin;

        const strong = [];
        const weak = [];
        for (const match of matches) {
            // Drop apps that disappeared since the index was built.
            if (!this._appSystem.lookup_app(match.id))
                continue;
            (match.cost <= STRONG_COST ? strong : weak).push(match.id);
        }

        const results = [];
        const seen = new Set();
        const add = id => {
            if (!seen.has(id)) {
                seen.add(id);
                results.push(id);
            }
        };

        strong.forEach(add);
        builtin.forEach(add);
        weak.forEach(add);

        return results;
    }
}
