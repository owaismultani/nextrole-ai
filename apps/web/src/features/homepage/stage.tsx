import type { RefObject } from "react";
import { useLingui } from "@lingui/react";
import { useEffect, useRef, useState } from "react";
import { templateSchema } from "@reactive-resume/schema/templates";
import { isRTL, localeSchema } from "@reactive-resume/utils/locale";
import { cn } from "@reactive-resume/utils/style";

type ParticleStageProps = { root: RefObject<HTMLElement | null> };

/**
 * The fixed canvas behind the page. three.js and the scene load only after the page is up; if WebGL is unavailable (the
 * renderer throws) or the GPU drops the context, a still gradient takes the canvas's place. Decorative: every point is
 * also made in the copy.
 */
export function ParticleStage({ root }: ParticleStageProps) {
	const { i18n } = useLingui();
	const canvas = useRef<HTMLCanvasElement>(null);
	const [fallback, setFallback] = useState(false);
	const rtl = isRTL(i18n.locale);

	useEffect(() => {
		const element = canvas.current;
		const page = root.current;
		if (!element || !page) return;

		let stop: (() => void) | undefined;
		let cancelled = false;
		import("./scene")
			.then(({ startScene }) =>
				startScene({
					canvas: element,
					root: page,
					rtl,
					reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
					templates: templateSchema.options.length,
					languages: localeSchema.options.length,
					onLost: () => setFallback(true),
				}),
			)
			.then((dispose) => {
				if (cancelled) dispose();
				else stop = dispose;
			})
			.catch(() => setFallback(true));

		return () => {
			cancelled = true;
			stop?.();
		};
	}, [root, rtl]);

	return (
		<div aria-hidden="true" className={cn("fixed inset-0 -z-1", fallback && "nr-fallback")}>
			<canvas ref={canvas} className={cn("block size-full", fallback && "hidden")} />
			<div className="nr-veil pointer-events-none absolute inset-0" />
		</div>
	);
}
