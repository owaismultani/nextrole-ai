# Launch video

A 29-second product video for NextRole AI, filmed from the real app on the fictional demo account (Alex Morgan, from
`../landing/seed-demo.ts`) and edited in code. It renders a 1080×1080 cut for LinkedIn, a 1920×1080 cut for GitHub,
DEV.to and YouTube, and a thumbnail in each shape.

| File              | Job                                                                                            |
| ----------------- | ---------------------------------------------------------------------------------------------- |
| `record.ts`       | Films each clip through Chrome's screencast at 2× (2880×1800), with a drawn cursor.            |
| `timeline.ts`     | The edit: scene timings, captions, which crew member is lit and the camera path in each shape. |
| `compositor.html` | Draws one frame of the video for a given time: background, window, captions, crew, end card.   |
| `render.ts`       | Steps the compositor frame by frame in headless Chromium and pipes the frames to ffmpeg.       |
| `explore.ts`      | Screenshots the filmed screens and a few interaction states, for planning camera moves.        |
| `shared.ts`       | Viewport, sign-in and demo-account lookups shared by the scripts.                              |

## Make it

Run the app locally (any port), then from the repository root:

```sh
export DEMO_APP_URL=http://localhost:3000
export FFMPEG=/path/to/ffmpeg          # needs libx264

pnpm --filter @reactive-resume/tooling exec tsx landing/seed-demo.ts
pnpm --filter @reactive-resume/tooling exec tsx launch-video/record.ts
pnpm --filter @reactive-resume/tooling exec tsx landing/seed-demo.ts --pause

pnpm --filter @reactive-resume/tooling exec tsx launch-video/render.ts
```

Everything lands in `tmp/launch-video/` (ignored by git): clips in `clips/`, videos and thumbnails in `out/`.

The clips change the demo account (a tracked job, a template switch, ticked plan steps), so seed before each take.
Re-film one clip with `record.ts studio`. Seed without `--pause` before filming so Discover shows the search as on, and
pause it afterwards so it never searches for real.

## Edit it

- Check a change with stills before a full render: `render.ts --stills 0,6.5,26 --format wide`.
- `record.ts` prints marks for moments the page decides, such as when the ATS score appears. If a take runs slower,
  move that scene's `in`, its sub-caption `at` and its camera keys in `timeline.ts` to match.
- Camera keys put a point of the filmed page (`x`, `y` from 0 to 1) in the middle of the window at zoom `z`.
- `render.ts` asserts each clip is long enough for its scene plus half a cross-fade.
