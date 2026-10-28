const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../lib/booking-slot.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const context = { exports: {} };
vm.runInNewContext(compiled, context);
const { validateBookingSlot } = context.exports;
const now = Date.parse('2026-10-28T10:00:00+05:30');
const slot = (date, start, duration) => validateBookingSlot(date, start, duration, now);
assert.equal(slot('2026-10-28', '10:01', 10).end_time, '10:11');
assert.equal(slot('2026-10-28', '10:00', 30).error, 'Bookings must start in the future');
assert.equal(slot('2026-10-28', '09:59', 30).error, 'Bookings must start in the future');
assert.equal(slot('2026-10-29', '22:00', 119).end_time, '23:59');
for (const args of [
  ['2026-10-29', '23:30', 30],
  ['2027-02-29', '12:00', 30],
  ['2026-10-29', '24:00', 30],
  ['2026-10-29', '10:00', '30'],
  ['2026-10-29', '10:00', 10.5],
  ['2026-10-29', '10:00', 9],
  ['2026-10-29', '10:00', 121],
  [null, '10:00', 30],
]) assert.ok(slot(...args).error, JSON.stringify(args));
assert.equal(slot('2028-02-29', '10:00', 120).end_time, '12:00');
console.log('PASS: booking times enforce IST, real dates, duration limits and midnight boundaries.');
