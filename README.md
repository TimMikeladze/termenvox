# Termenvox

A gesture-controlled theremin in one HTML file.
**[termenvox.vercel.app](https://termenvox.vercel.app)**

Right hand steers pitch across the field, left hand rides volume — lift to
swell, drop to hush (swappable for left-handed play). No camera? Drag in the
field, or press <kbd>K</kbd> and play the keyboard piano-style. Camera frames
are processed on-device and never uploaded.

## Features

- **Tuning** — 18 scales, 6 temperaments (equal, just, Pythagorean, ¼-comma
  meantone, Werckmeister III, Kirnberger III), adjustable A₄, transpose, fine
  tune, and a grid-pull blend between free glissando and locked scale
- **Voice** — two oscillators with interval and detune, sub octave, breath noise,
  drive, filter, vibrato, tremolo, ensemble, ping-pong echo, generated hall
- **Tracking** — MediaPipe hands with 1€ smoothing, falling back to a built-in
  skin-blob tracker, then to pointer and keyboard
- **MIDI out** — continuous pitch bend and CC11 expression
- Recording, 6 presets, JSON export/import, and settings that persist

Every control explains itself: hover a label, tap it on a phone, or press
**What's this?** to pin all the descriptions inline.

## Shortcuts

<kbd>Space</kbd> hold · <kbd>K</kbd> keyboard · <kbd>M</kbd> mute ·
<kbd>R</kbd> record · <kbd>C</kbd> camera · <kbd>L</kbd> latch ·
<kbd>F</kbd> fullscreen · <kbd>[</kbd> <kbd>]</kbd> octave ·
<kbd>1</kbd>–<kbd>6</kbd> presets · <kbd>Esc</kbd> panic · <kbd>?</kbd> help

## Development

```bash
npm run dev    # http://localhost:4173 — a server is only needed for camera access
npm test
```

`index.html` is the whole application; deploying it is copying one file. The
MediaPipe model is the only runtime fetch — without it the blob tracker takes
over. The music maths lives in a dependency-free `<script id="tvx-core">` block
inside the page; `test/core.test.mjs` extracts that block and runs it under
`node:test`.

## Analytics

Optional, and off unless configured. `npm run build` — the Vercel build command —
rewrites the `<!-- umami -->` block in `index.html` from the environment:

| Variable | |
| --- | --- |
| `UMAMI_WEBSITE_ID` | Enables analytics. Unset means no script is emitted at all. |
| `UMAMI_SCRIPT_URL` | Instance base URL or full `script.js` path. Defaults to `https://linesofcode-umami.vercel.app/script.js`. |
| `UMAMI_DOMAINS` | Comma-separated hosts to count, so previews and forks stay out of the stats. |

[Umami](https://umami.is) is cookieless and collects no personal data. The build
is idempotent, so running it without the variables strips the tag back out.

## Licence

MIT
