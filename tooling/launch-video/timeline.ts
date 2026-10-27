/**
 * The launch video's edit: which clip plays when, what the captions say and where the camera looks.
 *
 * Times are in seconds. A scene's `in` is the clip time shown at the scene's first frame; neighbouring scenes
 * cross-fade over `crossfade` seconds around their boundary, so each clip is filmed a little longer than its scene.
 * Camera keys are relative to the scene's start: `x` and `y` are the point of the filmed page (0–1) kept in the
 * middle of the window, and `z` is the zoom, where 1 just fills the window.
 */

export type CameraKey = { t: number; x: number; y: number; z: number };

export type Scene = {
	clip: string;
	start: number;
	end: number;
	in: number;
	kicker: string;
	/** Indexes into `crew` lit while the scene plays. */
	crew: number[];
	headline: string;
	/** Supporting lines; each replaces the one before at `at` seconds into the scene. */
	subs: { at: number; text: string }[];
	camera: { wide: CameraKey[]; square: CameraKey[] };
};

export type Timeline = {
	fps: number;
	duration: number;
	crossfade: number;
	/** When the last scene gives way to the end card. */
	endCard: number;
	crew: string[];
	chips: string[];
	scenes: Scene[];
};

export const timeline: Timeline = {
	fps: 30,
	duration: 29.4,
	crossfade: 0.5,
	endCard: 25.2,
	crew: ["The Scout", "The Writer", "The Editor", "The Coach", "The Tracker", "The Advisor"],
	chips: ["Free & open source", "MIT licensed", "Bring your own AI key", "Self-host with Docker"],
	scenes: [
		{
			clip: "discover",
			start: 0,
			end: 4.6,
			in: 0.2,
			kicker: "The Scout",
			crew: [0],
			headline: "Finds your next role while you sleep.",
			subs: [
				{ at: 0, text: "Scheduled searches across 11 job boards and the web." },
				{ at: 2.9, text: "One click tracks a role. Never added twice." },
			],
			camera: {
				wide: [
					{ t: 0, x: 0.5, y: 0.17, z: 1.62 },
					{ t: 1.7, x: 0.56, y: 0.52, z: 1.2 },
					{ t: 2.8, x: 0.6, y: 0.64, z: 1.34 },
					{ t: 4.6, x: 0.6, y: 0.72, z: 1.26 },
				],
				square: [
					{ t: 0, x: 0.52, y: 0.17, z: 1.42 },
					{ t: 1.7, x: 0.6, y: 0.52, z: 1.08 },
					{ t: 2.8, x: 0.62, y: 0.64, z: 1.18 },
					{ t: 4.6, x: 0.62, y: 0.72, z: 1.12 },
				],
			},
		},
		{
			clip: "fit",
			start: 4.6,
			end: 8.6,
			in: 0.35,
			kicker: "The Scout · Fit check",
			crew: [0],
			headline: "Checks your fit, with evidence.",
			subs: [{ at: 0, text: "Gaps stay visible. Nothing is invented." }],
			camera: {
				wide: [
					{ t: 0, x: 0.43, y: 0.4, z: 1.32 },
					{ t: 2.2, x: 0.43, y: 0.5, z: 1.46 },
					{ t: 4, x: 0.42, y: 0.6, z: 1.58 },
				],
				square: [
					{ t: 0, x: 0.45, y: 0.4, z: 1.2 },
					{ t: 2.2, x: 0.45, y: 0.5, z: 1.32 },
					{ t: 4, x: 0.44, y: 0.6, z: 1.44 },
				],
			},
		},
		{
			clip: "studio",
			start: 8.6,
			end: 15,
			in: 0.8,
			kicker: "The Writer + The Editor",
			crew: [1, 2],
			headline: "Tailors a resume for every role.",
			subs: [
				{ at: 0, text: "18 templates. Switch in one click." },
				{ at: 4.7, text: "An ATS check that points to the exact line." },
			],
			camera: {
				wide: [
					{ t: 0, x: 0.5, y: 0.45, z: 1.02 },
					{ t: 0.9, x: 0.38, y: 0.52, z: 1.12 },
					{ t: 2.2, x: 0.56, y: 0.48, z: 1.1 },
					{ t: 4.5, x: 0.52, y: 0.42, z: 1.02 },
					{ t: 5.2, x: 0.33, y: 0.34, z: 1.36 },
					{ t: 6.4, x: 0.3, y: 0.32, z: 1.44 },
				],
				square: [
					{ t: 0, x: 0.5, y: 0.45, z: 1 },
					{ t: 0.9, x: 0.34, y: 0.52, z: 1.08 },
					{ t: 2.2, x: 0.6, y: 0.48, z: 1.04 },
					{ t: 4.5, x: 0.5, y: 0.42, z: 1 },
					{ t: 5.2, x: 0.3, y: 0.34, z: 1.2 },
					{ t: 6.4, x: 0.28, y: 0.32, z: 1.28 },
				],
			},
		},
		{
			clip: "prepare",
			start: 15,
			end: 19,
			in: 0.3,
			kicker: "The Coach",
			crew: [3],
			headline: "A 30-minute plan for every interview.",
			subs: [{ at: 0, text: "Built from the posting and your strongest stories." }],
			camera: {
				wide: [
					{ t: 0, x: 0.42, y: 0.52, z: 1.36 },
					{ t: 2.4, x: 0.45, y: 0.57, z: 1.5 },
					{ t: 4, x: 0.56, y: 0.5, z: 1.42 },
				],
				square: [
					{ t: 0, x: 0.42, y: 0.52, z: 1.2 },
					{ t: 2.4, x: 0.44, y: 0.57, z: 1.3 },
					{ t: 4, x: 0.52, y: 0.52, z: 1.28 },
				],
			},
		},
		{
			clip: "tracker",
			start: 19,
			end: 21.8,
			in: 0.2,
			kicker: "The Tracker",
			crew: [4],
			headline: "Every application on one board.",
			subs: [{ at: 0, text: "From saved to offer, with a next step on each." }],
			camera: {
				wide: [
					{ t: 0, x: 0.5, y: 0.28, z: 1.32 },
					{ t: 1.3, x: 0.56, y: 0.4, z: 1.14 },
					{ t: 2.8, x: 0.64, y: 0.3, z: 1.24 },
				],
				square: [
					{ t: 0, x: 0.55, y: 0.28, z: 1.16 },
					{ t: 1.3, x: 0.6, y: 0.4, z: 1.02 },
					{ t: 2.8, x: 0.66, y: 0.3, z: 1.12 },
				],
			},
		},
		{
			clip: "tracker",
			start: 21.8,
			end: 25.2,
			in: 3,
			kicker: "The Advisor",
			crew: [5],
			headline: "Weighs offers against what matters.",
			subs: [{ at: 0, text: "Unknown terms stay in plain sight." }],
			camera: {
				wide: [
					{ t: 0, x: 0.64, y: 0.3, z: 1.24 },
					{ t: 0.9, x: 0.62, y: 0.46, z: 1.16 },
					{ t: 3.4, x: 0.64, y: 0.6, z: 1.34 },
				],
				square: [
					{ t: 0, x: 0.66, y: 0.3, z: 1.12 },
					{ t: 0.9, x: 0.62, y: 0.46, z: 1.04 },
					{ t: 3.4, x: 0.66, y: 0.6, z: 1.2 },
				],
			},
		},
	],
};
