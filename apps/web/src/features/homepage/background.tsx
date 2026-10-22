/**
 * The surface the story sits on: a quiet dot grid in the line color that fades out down the screen, a soft indigo wash
 * at the top, and in dark mode a glow that follows the cursor (the scroll engine writes --gx and --gy). All of it is
 * decorative and still under reduced motion.
 */
export function LandingBackground() {
	return (
		<div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
			<div className="absolute inset-0 bg-[radial-gradient(var(--line)_1px,transparent_1px)] [mask-image:linear-gradient(to_bottom,#000,transparent_85%)] bg-size-[24px_24px] opacity-80" />
			<div className="absolute inset-x-0 -top-[30vh] h-[80vh] bg-[radial-gradient(50%_50%_at_70%_50%,color-mix(in_oklch,var(--accent)_10%,transparent),transparent_70%)]" />
			<div
				data-glow
				className="absolute inset-0 bg-[radial-gradient(circle_620px_at_var(--gx,72%)_var(--gy,24%),color-mix(in_oklch,var(--accent)_9%,transparent),transparent_70%)] opacity-0 transition-opacity duration-[.8s] dark:opacity-100"
			/>
		</div>
	);
}
