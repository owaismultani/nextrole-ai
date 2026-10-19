/** Zoom is relative to fit width; 100% and Fit are the same state. */
export function snapZoom(value: number): number | null {
	"worklet";
	const snapped = Math.min(1.5, Math.max(0.6, Math.round(value * 20) / 20));
	return snapped === 1 ? null : snapped;
}

/** Keep a content point beneath the same viewport point after relayout. */
export function zoomOffset(offset: number, focal: number, before: number, after: number, inset: number) {
	return Math.max(0, ((offset + focal - inset) * after) / before + inset - focal);
}
