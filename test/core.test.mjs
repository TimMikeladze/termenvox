/**
 * Tests for the pure music core embedded in index.html.
 *
 * index.html is deliberately dependency-free and self-contained, so the core is
 * extracted from the <script id="tvx-core"> block and evaluated here. If that
 * block moves or is renamed, these tests fail loudly rather than silently pass.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(join(root, "index.html"), "utf8");
const m = html.match(/<script id="tvx-core">([\s\S]*?)<\/script>/);
assert.ok(m, 'index.html must contain <script id="tvx-core">');
const TVX = new Function(m[1] + "\nreturn TVX;")();

const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;

/* ── tuning ────────────────────────────────────────────── */
test("A4 is exactly the reference pitch in every temperament", () => {
  for (const t of Object.keys(TVX.TEMPERAMENTS)) {
    for (const root of [0, 3, 9]) {
      const f = TVX.midiToFreq(69, { a4: 440, temperament: t, root });
      assert.ok(near(f, 440, 1e-9), `${t} root=${root} gave ${f}`);
    }
  }
});

test("equal temperament matches the standard formula", () => {
  assert.ok(near(TVX.midiToFreq(60, { a4: 440 }), 261.6255653005986, 1e-9));
  assert.ok(near(TVX.midiToFreq(81, { a4: 440 }), 880, 1e-9));
  assert.ok(near(TVX.midiToFreq(57, { a4: 440 }), 220, 1e-9));
});

test("A4 reference retunes the whole instrument", () => {
  assert.ok(near(TVX.midiToFreq(69, { a4: 415 }), 415, 1e-9));
  assert.ok(near(TVX.midiToFreq(81, { a4: 415 }), 830, 1e-9));
});

test("just intonation gives a pure fifth and third over the tonic", () => {
  const o = { a4: 440, temperament: "just", root: 0 };
  const c = TVX.midiToFreq(60, o);
  assert.ok(near(TVX.midiToFreq(67, o) / c, 3 / 2, 1e-4), "fifth");
  assert.ok(near(TVX.midiToFreq(64, o) / c, 5 / 4, 1e-4), "major third");
});

test("pythagorean fifth is pure, its major third is not", () => {
  const o = { a4: 440, temperament: "pythagorean", root: 0 };
  const c = TVX.midiToFreq(60, o);
  assert.ok(near(TVX.midiToFreq(67, o) / c, 3 / 2, 1e-4));
  assert.ok(Math.abs(TVX.midiToFreq(64, o) / c - 5 / 4) > 0.004);
});

test("fine tune shifts by exact cents", () => {
  const a = TVX.midiToFreq(60, { a4: 440 });
  const b = TVX.midiToFreq(60, { a4: 440, fine: 100 });
  assert.ok(near(1200 * Math.log2(b / a), 100, 1e-6));
});

test("freqToMidi round-trips midiToFreq in equal temperament", () => {
  for (const m of [21, 60, 69, 108]) {
    assert.ok(near(TVX.freqToMidi(TVX.midiToFreq(m, { a4: 440 }), 440), m, 1e-9));
  }
});

test("centsFromNearest reports deviation against the active tuning", () => {
  const o = { a4: 440, temperament: "equal", root: 0 };
  const sharp = TVX.midiToFreq(60, o) * Math.pow(2, 20 / 1200);
  const r = TVX.centsFromNearest(sharp, o);
  assert.equal(r.midi, 60);
  assert.ok(near(r.cents, 20, 1e-6));

  // in a stretched temperament the reference note moves with it
  const j = { a4: 440, temperament: "just", root: 0 };
  const exact = TVX.midiToFreq(64, j);
  assert.ok(near(TVX.centsFromNearest(exact, j).cents, 0, 1e-6));
});

/* ── naming ────────────────────────────────────────────── */
test("note names use the MIDI octave convention", () => {
  assert.deepEqual(TVX.noteLabel(60, false), { name: "C", oct: 4, pc: 0 });
  assert.deepEqual(TVX.noteLabel(69, false), { name: "A", oct: 4, pc: 9 });
  assert.deepEqual(TVX.noteLabel(21, false), { name: "A", oct: 0, pc: 9 });
  assert.equal(TVX.noteLabel(61, true).name, "D♭");
  assert.equal(TVX.noteLabel(61, false).name, "C♯");
});

test("the low-octave control label agrees with the notes it produces", () => {
  // panel shows "C<n>" for baseOct n; the lowest note must actually be that C
  for (const baseOct of [0, 2, 5, 7]) {
    const lowest = TVX.normToMidi(0, { baseOct, rangeOct: 3, scale: "off" });
    const lbl = TVX.noteLabel(lowest, false);
    assert.equal(lbl.name, "C");
    assert.equal(lbl.oct, baseOct, `baseOct ${baseOct}`);
  }
});

/* ── scales & quantisation ─────────────────────────────── */
test("nearest-note quantisation only lands on scale tones", () => {
  const o = { baseOct: 2, rangeOct: 3, scale: "major", root: 0, quantMode: "nearest" };
  for (let i = 0; i <= 200; i++) {
    const m = TVX.normToMidi(i / 200, o);
    const pc = TVX.mod(Math.round(m), 12);
    assert.ok(TVX.SCALES.major.includes(pc), `n=${i / 200} → midi ${m}`);
  }
});

test("even-step quantisation walks the scale one degree at a time", () => {
  const o = { baseOct: 2, rangeOct: 1, scale: "pentaMin", root: 0, quantMode: "step" };
  const seen = [];
  for (let i = 0; i <= 100; i++) {
    const m = TVX.normToMidi(i / 100, o);
    if (!seen.length || seen[seen.length - 1] !== m) seen.push(m);
  }
  // strictly ascending, and every value is an in-scale degree
  for (let i = 1; i < seen.length; i++) assert.ok(seen[i] > seen[i - 1]);
  const degs = TVX.scaleDegrees("pentaMin", 0, 36, 12);
  for (const m of seen) assert.ok(degs.includes(m), `${m} not a degree`);
});

test("grid pull blends continuously between free and snapped", () => {
  const base = { baseOct: 2, rangeOct: 3, scale: "major", root: 0, quantMode: "nearest" };
  const n = 0.137;
  const free = TVX.normToMidi(n, { ...base, scale: "off" });
  const snapped = TVX.normToMidi(n, { ...base, quantAmt: 1 });
  const half = TVX.normToMidi(n, { ...base, quantAmt: 0.5 });
  assert.ok(near(half, (free + snapped) / 2, 1e-9));
  assert.ok(near(TVX.normToMidi(n, { ...base, quantAmt: 0 }), free, 1e-9));
});

test("continuous mode is a straight line across the span", () => {
  const o = { baseOct: 2, rangeOct: 3, scale: "off" };
  assert.equal(TVX.normToMidi(0, o), 36);
  assert.equal(TVX.normToMidi(1, o), 72);
  assert.equal(TVX.normToMidi(0.5, o), 54);
});

test("root transposes the grid", () => {
  const o = { baseOct: 2, rangeOct: 2, scale: "major", root: 2, quantMode: "nearest" };
  for (let i = 0; i <= 60; i++) {
    const pc = TVX.mod(Math.round(TVX.normToMidi(i / 60, o)) - 2, 12);
    assert.ok(TVX.SCALES.major.includes(pc));
  }
});

test("transpose shifts every note by the same amount", () => {
  const o = { baseOct: 2, rangeOct: 3, scale: "major", root: 0 };
  for (const n of [0, 0.25, 0.5, 0.75, 1]) {
    assert.equal(TVX.normToMidi(n, { ...o, transpose: 5 }), TVX.normToMidi(n, o) + 5);
  }
});

test("output stays inside the MIDI range even at extreme settings", () => {
  const o = { baseOct: 7, rangeOct: 6, scale: "off", transpose: 24 };
  const hi = TVX.normToMidi(1, o);
  assert.ok(hi <= 127, `got ${hi}`);
  const lo = TVX.normToMidi(0, { baseOct: 0, rangeOct: 1, scale: "off", transpose: -24 });
  assert.ok(lo >= 0, `got ${lo}`);
});

test("input outside 0..1 is clamped, not extrapolated", () => {
  const o = { baseOct: 2, rangeOct: 3, scale: "off" };
  assert.equal(TVX.normToMidi(-5, o), 36);
  assert.equal(TVX.normToMidi(9, o), 72);
});

test("scaleDegrees covers the range inclusively and in order", () => {
  const d = TVX.scaleDegrees("major", 0, 60, 12);
  assert.deepEqual(d, [60, 62, 64, 65, 67, 69, 71, 72]);
  const p = TVX.scaleDegrees("pentaMaj", 9, 57, 12); // A pentatonic major
  assert.deepEqual(p, [57, 59, 61, 64, 66, 69]);
});

test("snapNearest picks the closer neighbour on both sides", () => {
  assert.equal(TVX.snapNearest(60.4, "major", 0), 60);
  assert.equal(TVX.snapNearest(60.9, "major", 0), 60); // C is still the closer tone
  assert.equal(TVX.snapNearest(61.2, "major", 0), 62); // past the midpoint, D wins
  assert.equal(TVX.snapNearest(71.6, "major", 0), 72); // wraps to the octave
  assert.equal(TVX.snapNearest(-1.4, "major", 0), -1); // negative octaves work
});

test("every scale is sorted, unique and inside one octave", () => {
  for (const [name, set] of Object.entries(TVX.SCALES)) {
    assert.ok(set.length > 0, name);
    assert.equal(new Set(set).size, set.length, `${name} has duplicates`);
    assert.equal(set[0], 0, `${name} must start on the tonic`);
    for (let i = 1; i < set.length; i++) assert.ok(set[i] > set[i - 1], `${name} unsorted`);
    assert.ok(set[set.length - 1] < 12, `${name} exceeds an octave`);
  }
});

test("every temperament table has 12 finite entries", () => {
  for (const [name, dev] of Object.entries(TVX.TEMPERAMENTS)) {
    assert.equal(dev.length, 12, name);
    for (const v of dev) assert.ok(Number.isFinite(v) && Math.abs(v) < 60, name);
  }
});

/* ── field mapping ─────────────────────────────────────── */
test("mapField rescales the usable field to the full 0..1 range", () => {
  assert.ok(near(TVX.mapField(0.1, 0.1, 0.9), 0));
  assert.ok(near(TVX.mapField(0.9, 0.1, 0.9), 1));
  assert.ok(near(TVX.mapField(0.5, 0.1, 0.9), 0.5));
  assert.equal(TVX.mapField(0.05, 0.1, 0.9), 0); // clamped
  assert.equal(TVX.mapField(0.95, 0.1, 0.9), 1);
  assert.equal(TVX.mapField(0.42, 0.5, 0.5), 0.42); // degenerate bounds pass through
});

/* ── 1€ filter ─────────────────────────────────────────── */
test("1€ filter latches onto the first sample", () => {
  const f = new TVX.OneEuro(1.6, 0.02);
  assert.equal(f.filter(0.7, 1 / 60), 0.7);
});

test("1€ filter suppresses jitter but converges on the true value", () => {
  const f = new TVX.OneEuro(1.0, 0.0);
  const dt = 1 / 60;
  f.filter(0.5, dt);
  let maxDev = 0;
  for (let i = 0; i < 120; i++) {
    const out = f.filter(0.5 + (i % 2 ? 0.05 : -0.05), dt);
    maxDev = Math.max(maxDev, Math.abs(out - 0.5));
  }
  assert.ok(maxDev < 0.02, `jitter leaked through: ${maxDev}`);

  for (let i = 0; i < 400; i++) f.filter(0.9, dt);
  assert.ok(Math.abs(f.filter(0.9, dt) - 0.9) < 1e-3);
});

test("1€ filter tracks fast motion more tightly than slow drift", () => {
  const dt = 1 / 60;
  const run = (beta, step) => {
    const f = new TVX.OneEuro(1.0, beta);
    let v = 0;
    f.filter(0, dt);
    for (let i = 1; i <= 20; i++) v = f.filter(i * step, dt);
    return (20 * step - v) / (20 * step); // relative lag
  };
  assert.ok(run(0.2, 0.02) < run(0.0, 0.02), "beta must reduce lag on fast moves");
});

test("1€ filter survives NaN input", () => {
  const f = new TVX.OneEuro();
  f.filter(0.5, 1 / 60);
  assert.equal(f.filter(NaN, 1 / 60), 0.5);
});

/* ── helpers ───────────────────────────────────────────── */
test("clamp and mod behave at the edges", () => {
  assert.equal(TVX.clamp(-1, 0, 1), 0);
  assert.equal(TVX.clamp(2, 0, 1), 1);
  assert.equal(TVX.mod(-1, 12), 11);
  assert.equal(TVX.mod(13, 12), 1);
});
