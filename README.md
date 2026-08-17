# Termenvox

A gesture-controlled theremin that runs entirely in the browser. Wave your hands
in front of the camera to bend pitch and swell volume, or play it with a mouse,
a finger, or the letter row. No install, no build step, no server — one HTML file.

Camera frames never leave the device.

---

## Playing it

1. Press **Power on**. The audio engine starts and the camera is requested.
2. Move your hand across the field to steer pitch; move it up and down to swell
   the volume.
3. If the camera is unavailable, drag inside the field with a mouse or finger, or
   press <kbd>K</kbd> and play the letter row.

Hand tracking uses MediaPipe Hands, loaded from a CDN on demand. If that fails —
offline, blocked, or a browser it does not support — the instrument silently falls
back to a built-in skin-blob tracker, and if there is no camera at all, to pointer
and keyboard play. It always makes sound.

### Gesture modes

| Mode | Pitch | Volume |
| --- | --- | --- |
| One hand — fingertip | index fingertip across the field | fingertip up/down |
| Two hands — classic | right hand (the pitch antenna) | left hand height (the volume loop) |
| One hand — pinch swell | index fingertip | thumb-to-finger distance |
| Pointer / keyboard only | drag or letter row | drag height |

### Keyboard

| Key | Action |
| --- | --- |
| <kbd>Space</kbd> | Hold the note at full swell |
| <kbd>K</kbd> | Music keyboard mode — <kbd>A</kbd>…<kbd>'</kbd> plays notes |
| <kbd>M</kbd> | Mute / unmute |
| <kbd>R</kbd> | Record / stop |
| <kbd>C</kbd> | Camera on / off |
| <kbd>L</kbd> | Latch — hold the current volume when the hands leave |
| <kbd>F</kbd> | Fullscreen the field |
| <kbd>[</kbd> <kbd>]</kbd> | Octave down / up |
| <kbd>1</kbd>…<kbd>6</kbd> | Load preset |
| <kbd>Esc</kbd> | Panic — silence everything |
| <kbd>?</kbd> | Shortcut card |

In music keyboard mode the letters become notes, so use the panel buttons for
mute, record and the rest.

---

## The panel

Every control carries an explanation. Hover a label on a desktop, tap it on a
phone, or press **What's this?** to pin a description under every control at once.
Sections collapse; the open/closed state, all parameter values, and your saved
setups persist in the browser.

**Gesture** — mode, pitch axis, response, glide, tracking smoothing, volume law
and silence floor, plus the invert/swap/mirror toggles.

**Playing field** — trim the rectangle inside the camera view that counts as the
instrument, so the full pitch range lands inside your actual reach.

**Scale & tuning** — 18 scales plus continuous (no grid at all), a root, two
quantisation feels, a continuous grid-pull blend, six temperaments, octave range,
transpose, fine tune and the A₄ reference.

**Voice** — two oscillators (four analogue waveforms plus four additive ones),
interval and detune between them, a sub octave, a filtered breath-noise layer and
soft saturation.

**Modulation** — vibrato with a volume-tracking depth, and tremolo.

**Filter** — low/band/high/peak, cutoff, resonance, and how much the open hand and
the pitch itself move the cutoff.

**Space** — a wide two-voice ensemble, an echo with tone and optional ping-pong, and
a generated hall with size, decay and pre-delay.

**Output & practice** — master level and a reference drone on the root, for
practising intonation against.

**MIDI out** — drive external gear with the same gestures.

### Tuning

The instrument is built from a reference pitch and a temperament rather than a
hard-coded equal-tempered table:

- **Temperaments:** equal (12-TET), just intonation, Pythagorean, ¼-comma
  meantone, Werckmeister III, Kirnberger III. Offsets are taken relative to the
  selected root, and normalised so A₄ always lands exactly on the reference pitch
  whatever the temperament and root.
- **A₄ reference:** 392–466 Hz.
- **Grid pull** blends continuously between a free glissando and a locked scale, so
  you can keep expressive drift while still landing on the note.
- **Grid feel:** *nearest note* keeps the field linear in pitch and snaps to the
  closest scale tone; *even steps* gives every scale degree the same width, like
  frets.

The tuner strip under the readout shows the deviation in cents against the active
tuning, and locks green inside ±5 cents.

### MIDI

With **Send MIDI** on, the gesture is transmitted as a note plus continuous pitch
bend on the chosen channel, with volume as velocity and optionally as CC11
expression. Set **Bend range** to match the receiving synth or the notes will
arrive out of tune; a wider range means fewer re-triggers during long slides.
Requires a browser with Web MIDI (Chrome, Edge, Opera).

### Recording

**Record** captures the output — effects, limiter and all — through a
`MediaStreamDestination`, and offers it as a download when you stop. Format follows
what the browser supports: Opus in WebM where available, MP4 on Safari.

---

## Presets

Six built-in setups (<kbd>1</kbd>–<kbd>6</kbd>): Clara's aria, Forbidden planet,
Bowed cello, Glass bell, Sub drone, Wire lead. A preset restores *every* parameter,
so nothing leaks in from whatever you had loaded before.

Your own setups save to the browser under a name, and the whole panel can be
exported to and imported from JSON.

---

## Running it

Open `index.html` — that is the whole application. Nothing is bundled, compiled or
fetched at build time.

A local server is only needed for camera access, since `getUserMedia` requires a
secure context (`localhost` counts):

```bash
npm run dev     # python3 -m http.server 4173
```

Then visit <http://localhost:4173>.

## Tests

```bash
npm test
```

The music core — temperaments, quantisation, scale maths, note naming, field
mapping and the 1€ smoothing filter — lives in a dependency-free
`<script id="tvx-core">` block inside `index.html`. `test/core.test.mjs` extracts
that block and runs it under `node:test`, so the app stays a single file while the
parts that must be numerically correct are covered.

## Layout

```
index.html            the entire application
  <script id="tvx-core">   pure music maths — no DOM, no Web Audio, tested
  <script>                 audio engine, tracking, rendering, UI
test/core.test.mjs    tests for the core, extracted from index.html
```

The control panel is generated from a declarative `SPEC` array, so a parameter is
defined once and gets its control, formatter, tooltip, persistence, preset
handling and reset behaviour from that one definition.

## Browser support

| | |
| --- | --- |
| Audio, pointer & keyboard play | any modern browser |
| Hand tracking | Chrome, Edge, Safari, Firefox (camera permission required) |
| MIDI out | Chrome, Edge, Opera |
| Recording | Chrome, Edge, Firefox (WebM/Opus); Safari (MP4) |

Works on phones: the field stays pinned to the top while the controls scroll under
it, and touch targets, tooltips and the safe-area insets are handled.

## Licence

MIT
