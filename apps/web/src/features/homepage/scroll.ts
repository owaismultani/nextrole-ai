import type { RefObject } from "react";
import { useEffect } from "react";
import { create } from "zustand";

/** Each section's `data-scene` index, in page order. Scenes 0–4 are pinned; the rest scroll normally. */
export const SCENE = {
	hero: 0,
	baseline: 1,
	discover: 2,
	prepare: 3,
	pipeline: 4,
	builder: 5,
	control: 6,
	numbers: 7,
	languages: 8,
	support: 9,
	faq: 10,
	footer: 11,
} as const;

/**
 * Where each pinned scene moves on to its next step, as a share of its scroll. A scene's step is how many of its
 * thresholds the scroll has passed, so a scene with five thresholds runs from step 0 to step 5.
 */
const SCENE_STEPS: Partial<Record<number, number[]>> = {
	[SCENE.hero]: [0.1, 0.24, 0.38, 0.52, 0.66],
	[SCENE.baseline]: [0.08, 0.15, 0.22, 0.29, 0.36, 0.43, 0.5, 0.64, 0.78],
	[SCENE.discover]: [0.1, 0.2, 0.3, 0.42, 0.54, 0.66, 0.8],
	[SCENE.prepare]: [0.12, 0.26, 0.4, 0.54, 0.68, 0.82],
	[SCENE.pipeline]: [0.12, 0.26, 0.4, 0.54, 0.68, 0.82],
};

/** How many steps a scene has, so a scene can tell its end state from the middle. */
export const lastStep = (scene: number) => SCENE_STEPS[scene]?.length ?? 0;

/**
 * The coarse state of the story. Continuous motion never goes through React: the engine below writes each section's
 * progress as the CSS variable --p and the scenes derive everything else from it with calc(). React only hears about
 * steps: which scene is on screen and how far each pinned scene has got.
 */
type LandingState = {
	activeScene: number;
	reducedMotion: boolean;
	scrolled: boolean;
	/** Each pinned scene's step, by scene index (see SCENE_STEPS). */
	steps: Record<number, number>;
	/** Numbers: scrolled far enough in for the digits to roll. It stays true. */
	numbersInView: boolean;
};

export const useLanding = create<LandingState>()(() => ({
	activeScene: SCENE.hero,
	reducedMotion: false,
	scrolled: false,
	steps: {},
	numbersInView: false,
}));

/** A pinned scene's current step. */
export const useStep = (scene: number) => useLanding((state) => state.steps[scene] ?? 0);

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

const stepsPassed = (progress: number, thresholds: number[]) => thresholds.filter((at) => progress >= at).length;

/**
 * A section's progress through the viewport, from 0 to 1. A pinned scene counts how far its sticky stage has
 * travelled; any other section counts how much of it has come into view.
 */
export function sectionProgress(top: number, height: number, viewportHeight: number, pinned: boolean) {
	if (pinned) return clamp01(-top / Math.max(1, height - viewportHeight));
	return clamp01((viewportHeight - top) / Math.max(1, Math.min(height, viewportHeight)));
}

const reducedMotionQuery = "(prefers-reduced-motion: reduce)";

export const prefersReducedMotion = () => window.matchMedia(reducedMotionQuery).matches;

/** Scrolls to a point within a scene, e.g. `at = 0.04` for just after it pins. */
export function goToScene(index: number, at: number) {
	const section = document.querySelector<HTMLElement>(`[data-scene="${index}"]`);
	if (!section) return;
	const rect = section.getBoundingClientRect();
	const top = rect.top + window.scrollY + at * Math.max(0, rect.height - window.innerHeight);
	window.scrollTo({ top, behavior: prefersReducedMotion() ? "auto" : "smooth" });
}

/**
 * The scroll engine: one rAF-throttled listener that writes --p on every `[data-scene]` section inside `root` and
 * publishes the coarse steps to `useLanding`. It also moves the dark-mode glow with the mouse.
 */
export function useScrollScenes(root: RefObject<HTMLElement | null>) {
	useEffect(() => {
		const container = root.current;
		if (!container) return;

		const reducedMotion = window.matchMedia(reducedMotionQuery);
		const sections = [...container.querySelectorAll<HTMLElement>("[data-scene]")];
		// Rewriting an unchanged --p would still restyle the whole section, so only changes are written.
		const writtenProgress = new WeakMap<HTMLElement, string>();

		let frame = 0;

		const measure = () => {
			frame = 0;
			const viewportHeight = window.innerHeight;
			const reduced = reducedMotion.matches;
			const progress: number[] = [];
			let activeScene: number = SCENE.hero;

			for (const section of sections) {
				const index = Number(section.dataset.scene);
				const rect = section.getBoundingClientRect();
				const pinned = section.dataset.pin !== undefined;
				progress[index] = reduced ? 1 : sectionProgress(rect.top, rect.height, viewportHeight, pinned);
				if (rect.top <= viewportHeight / 2 && rect.bottom > viewportHeight / 2) activeScene = index;
			}
			for (const section of sections) {
				const value = (progress[Number(section.dataset.scene)] ?? 0).toFixed(4);
				if (writtenProgress.get(section) === value) continue;
				section.style.setProperty("--p", value);
				writtenProgress.set(section, value);
			}

			const state = useLanding.getState();
			const steps: Record<number, number> = {};
			for (const [scene, thresholds] of Object.entries(SCENE_STEPS)) {
				steps[Number(scene)] = stepsPassed(progress[Number(scene)] ?? 0, thresholds ?? []);
			}
			const stepsChanged = Object.entries(steps).some(([scene, step]) => state.steps[Number(scene)] !== step);

			const next = {
				activeScene,
				reducedMotion: reduced,
				scrolled: window.scrollY > 8,
				numbersInView: state.numbersInView || (progress[SCENE.numbers] ?? 0) > 0.2,
			};
			const changed = (Object.keys(next) as (keyof typeof next)[]).some((key) => next[key] !== state[key]);
			if (changed || stepsChanged) useLanding.setState(stepsChanged ? { ...next, steps } : next);
		};

		const schedule = () => {
			if (!frame) frame = requestAnimationFrame(measure);
		};

		// The pointer moves the dark-mode glow.
		let pointerFrame = 0;
		let pointer = { x: 0, y: 0 };
		const onPointerMove = (event: PointerEvent) => {
			if (event.pointerType !== "mouse") return;
			pointer = { x: event.clientX, y: event.clientY };
			if (pointerFrame) return;
			pointerFrame = requestAnimationFrame(() => {
				pointerFrame = 0;
				if (reducedMotion.matches) return;
				const glow = container.querySelector<HTMLElement>("[data-glow]");
				glow?.style.setProperty("--gx", `${pointer.x}px`);
				glow?.style.setProperty("--gy", `${pointer.y}px`);
			});
		};

		measure();
		window.addEventListener("scroll", schedule, { passive: true });
		window.addEventListener("resize", schedule);
		window.addEventListener("pointermove", onPointerMove, { passive: true });
		reducedMotion.addEventListener("change", schedule);

		return () => {
			cancelAnimationFrame(frame);
			cancelAnimationFrame(pointerFrame);
			window.removeEventListener("scroll", schedule);
			window.removeEventListener("resize", schedule);
			window.removeEventListener("pointermove", onPointerMove);
			reducedMotion.removeEventListener("change", schedule);
		};
	}, [root]);
}
