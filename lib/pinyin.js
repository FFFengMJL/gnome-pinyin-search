// SPDX-License-Identifier: MIT
// Pure-JS pinyin matching for the GNOME Shell extension.
// No GNOME imports here, so it can be tested with plain `gjs -m`.

const DIACRITICS = /[\u0300-\u036f]/g;
const CJK_RE = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\u3007]/;

/**
 * Normalize a search query into the alphabet used by the pinyin table:
 * lower-case ASCII letters only, no spaces, no tones, ü -> v.
 *
 * @param {string} text
 * @returns {string}
 */
export function normalizeQuery(text) {
    return text
        .normalize('NFKC')
        .toLowerCase()
        .replace(/[üǖǘǚǜ]/g, 'v')
        .normalize('NFD')
        .replace(DIACRITICS, '')
        .replace(/[^a-z0-9]/g, '');
}

/**
 * Turn an application name into a list of "units".
 *
 * Every Han character becomes one unit holding all of its readings. Latin
 * letters and digits become single-letter units, so names like `QQ音乐` can
 * still be matched from the Han part. Punctuation and spaces are dropped.
 *
 * @param {string} name
 * @param {Record<string, string>} table  char -> "reading|reading"
 * @returns {string[][] | null} units, or null when the name has no Han char
 */
export function buildUnits(name, table) {
    const units = [];
    let hasHan = false;

    for (const ch of name.normalize('NFC')) {
        const readings = table[ch];
        if (readings) {
            units.push(readings.split('|'));
            hasHan = true;
            continue;
        }
        if (CJK_RE.test(ch))
            continue; // Han char outside the table: cannot be matched
        if (/^[a-z0-9]$/i.test(ch))
            units.push([ch.toLowerCase()]);
    }

    return hasHan ? units : null;
}

/**
 * Match `query` against a name's units.
 *
 * The query must be a contiguous sequence of syllable prefixes. Intermediate
 * units must consume a non-empty prefix of one reading; the last one may stop
 * in the middle (`ruanj` for 软件/ruanjian). Initials and mixed forms fall out
 * of the same rule (`rj`, `ruji`).
 *
 * Starting at the very first unit costs nothing; starting later (for example
 * `yinyue` against `QQ音乐`) costs one point, so prefix matches rank first.
 *
 * @param {string} query normalized query
 * @param {string[][]} units
 * @returns {number} cost (lower is better), or Infinity when there is no match
 */
export function matchUnits(query, units) {
    const length = query.length;
    if (length === 0)
        return Infinity;

    // started[j]: best cost for having consumed query[0..j) and already
    // started matching. Units cannot be skipped once matching has started.
    let started = new Array(length + 1).fill(Infinity);
    let best = Infinity;

    for (let unitIndex = 0; unitIndex < units.length; unitIndex++) {
        const readings = units[unitIndex];
        const next = new Array(length + 1).fill(Infinity);
        const startCost = unitIndex === 0 ? 0 : 1;

        // Start matching at this unit.
        for (const reading of readings) {
            const max = Math.min(reading.length, length);
            for (let k = 1; k <= max; k++) {
                if (query[k - 1] !== reading[k - 1])
                    break;
                const cost = startCost + (k < reading.length ? 1 : 0);
                if (cost < next[k])
                    next[k] = cost;
            }
        }

        // Continue a match that started earlier.
        for (let j = 1; j < length; j++) {
            const base = started[j];
            if (base === Infinity)
                continue;

            for (const reading of readings) {
                const max = Math.min(reading.length, length - j);
                for (let k = 1; k <= max; k++) {
                    if (query[j + k - 1] !== reading[k - 1])
                        break;
                    const cost = base + (k < reading.length ? 1 : 0);
                    if (cost < next[j + k])
                        next[j + k] = cost;
                }
            }
        }

        started = next;

        if (started[length] < best)
            best = started[length];
    }

    return best;
}
