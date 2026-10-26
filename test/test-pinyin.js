// SPDX-License-Identifier: MIT
// Run with: gjs -m test/test-pinyin.js
import Gio from 'gi://Gio';
import {buildUnits, matchUnits, normalizeQuery} from '../lib/pinyin.js';

const [ok, bytes] = Gio.File.new_for_path('pinyin-table.json').load_contents(null);
if (!ok)
    throw new Error('cannot read pinyin-table.json');
const table = JSON.parse(new TextDecoder().decode(bytes));

function cost(name, query) {
    const units = buildUnits(name, table);
    if (!units)
        return Infinity;
    return matchUnits(normalizeQuery(query), units);
}

let failures = 0;
function expect(name, query, expected) {
    const got = cost(name, query);
    const pass = got === expected;
    if (!pass)
        failures++;
    print(`${pass ? 'ok  ' : 'FAIL'} ${name.padEnd(12)} ${JSON.stringify(query).padEnd(14)} -> ${got} (expected ${expected})`);
}

expect('设置', 'shezhi', 0);
expect('设置', 'she zhi', 0);
expect('设置', 'shezh', 1);
expect('设置', 'sz', 2);
expect('设置', 'shzh', 2);
expect('设置', 'sez', Infinity);
expect('软件', 'ruanjian', 0);
expect('软件', 'ruan jian', 0);
expect('软件', 'ruanj', 1);
expect('软件', 'ruji', 2);
expect('软件', 'rj', 2);
expect('音乐', 'yinyue', 0);
expect('音乐', 'yiny', 1);
expect('音乐', 'yy', 2);
expect('重庆', 'chongqing', 0);
expect('重庆', 'zhongqing', 0);
expect('重庆', 'cq', 2);
expect('银行', 'yinhang', 0);
expect('银行', 'yinxing', 0);
expect('网易云音乐', 'wangyi', 0);
expect('网易云音乐', 'wyyyy', 5);
expect('QQ音乐', 'yinyue', 1);
expect('计算器', 'jsq', 3);
expect('计算器', 'jisuanqi', 0);
expect('设置', 'firefox', Infinity);
expect('女', 'nv', 0);
expect('女', 'nu', 0);
expect('绿', 'lv', 0);
expect('绿', 'lu', 0);

// Normalization of tone marks and punctuation.
if (normalizeQuery('Shè Zhì!') !== 'shezhi') {
    failures++;
    print('FAIL normalizeQuery tone marks');
}

// Smoke test against every installed application name.
const appNames = Gio.AppInfo.get_all().map(info => [
    info.get_id(),
    info.get_display_name() || info.get_name(),
]);
let matched = 0;
const started = Date.now();
for (const [, name] of appNames) {
    if (cost(name, 'shezhi') < Infinity)
        matched++;
}
print(`\nscanned ${appNames.length} installed app names in ${Date.now() - started} ms, ${matched} matched "shezhi"`);

if (failures > 0)
    throw new Error(`${failures} pinyin matcher test(s) failed`);
print('\nall pinyin matcher tests passed');
