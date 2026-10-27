/** A section's place in the journey, as `data-stage` marks it, measured against the viewport. */
export type StageBox = {
	stage: number;
	top: number;
	bottom: number;
	/** The next section's stage, or null when the next section doesn't take part. */
	next: number | null;
};

/** Each act's index in the journey; the particle field holds one formation per stage. */
export const STAGE = {
	hero: 0,
	know: 1,
	scout: 2,
	write: 3,
	studio: 4,
	coach: 5,
	track: 6,
	everywhere: 7,
	rules: 8,
	finale: 9,
} as const;

export const lastStage = STAGE.finale;

/**
 * Where the scroll is in the journey, as a continuous stage: 2 while the Scout act holds the middle of the screen,
 * 2.5 halfway through its morph into the Writer. A section holds its stage for its first half and blends into the next
 * one over its second, unless the next section shares its stage.
 */
export function stageAt(boxes: StageBox[], viewportHeight: number): number {
	const middle = viewportHeight / 2;

	for (const box of boxes) {
		if (box.top > middle || box.bottom <= middle) continue;
		if (box.next === null || box.next === box.stage) return box.stage;

		const progress = (middle - box.top) / (box.bottom - box.top);
		return box.stage + Math.min(1, Math.max(0, (progress - 0.5) / 0.5));
	}

	const first = boxes[0];
	return first && first.top > middle ? first.stage : lastStage;
}

/** Where a block of copy sits, measured against the viewport. */
export type CopyBox = { top: number; bottom: number };

/**
 * How much of the band at the top of the screen, `zone` pixels tall, is covered by copy: 0 when it's clear, 1 once
 * any block of copy fills half of it. On phones the field rides in that band, so it fades as the copy rises through.
 */
export function coverAt(boxes: CopyBox[], zone: number): number {
	let cover = 0;
	for (const box of boxes) {
		const overlap = Math.min(box.bottom, zone) - Math.max(box.top, 0);
		cover = Math.max(cover, overlap / (zone / 2));
	}
	return Math.min(1, cover);
}

/** Measures every `[data-copy]` block under the root, from its first child's top to its last child's bottom. */
export function readCopy(root: ParentNode): CopyBox[] {
	const blocks = Array.from(root.querySelectorAll<HTMLElement>("[data-copy]"));

	return blocks.flatMap((block) => {
		const first = block.firstElementChild;
		const last = block.lastElementChild;
		if (!first || !last) return [];
		return [{ top: first.getBoundingClientRect().top, bottom: last.getBoundingClientRect().bottom }];
	});
}

/** Measures every `[data-stage]` section under the root, in page order. */
export function readStages(root: ParentNode): StageBox[] {
	const sections = Array.from(root.querySelectorAll<HTMLElement>("[data-stage]"));

	return sections.map((section) => {
		const rect = section.getBoundingClientRect();
		const next = section.nextElementSibling;
		const nextStage =
			next instanceof HTMLElement && next.dataset.stage !== undefined ? Number(next.dataset.stage) : null;
		return { stage: Number(section.dataset.stage), top: rect.top, bottom: rect.bottom, next: nextStage };
	});
}
