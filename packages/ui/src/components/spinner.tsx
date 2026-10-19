import type * as React from "react";
import { useState } from "react";
import {
	BeatLoader,
	BounceLoader,
	CircleLoader,
	DotLoader,
	PuffLoader,
	PulseLoader,
	ScaleLoader,
	SkewLoader,
	SquareLoader,
} from "react-spinners";
import { cn } from "@reactive-resume/utils/style";

// Sizes are in em, and the inner box sets 1em to the spinner's shorter side, so every loader fills whatever box the
// caller sizes. Loaders that hardcode px offsets or parse hex colors (Moon, Clock, Fade, Hash, Bar, ...) can't do that,
// and Ring vanishes at 14px whenever both rings turn edge-on.
const LOADERS = [
	<BeatLoader key="beat" color="currentColor" size="0.25em" margin="0.04em" />,
	<BounceLoader key="bounce" color="currentColor" size="1em" />,
	<CircleLoader key="circle" color="currentColor" size="1em" />,
	<DotLoader key="dot" color="currentColor" size="1em" />,
	<PuffLoader key="puff" color="currentColor" size="1em" />,
	<PulseLoader key="pulse" color="currentColor" size="0.25em" margin="0.04em" />,
	<ScaleLoader
		key="scale"
		color="currentColor"
		height="0.8em"
		width="0.16em"
		margin="0.04em"
		radius="0.08em"
		barCount={4}
	/>,
	<SkewLoader key="skew" color="currentColor" size="0.5em" />,
	<SquareLoader key="square" color="currentColor" size="0.7em" />,
];

const pickLoader = () => LOADERS[Math.floor(Math.random() * LOADERS.length)];

type SpinnerProps = React.ComponentProps<"span"> & {
	/** Hide it from assistive tech when the surrounding control already says it's busy. */
	decorative?: boolean;
};

/** A 14px loader, picked at random per mount. Pair it with text that says what's happening. */
function Spinner({ className, decorative = false, ...props }: SpinnerProps) {
	const [loader] = useState(pickLoader);
	const semantics = decorative
		? ({ "aria-hidden": true } as const)
		: ({ role: "status", "aria-label": "Loading" } as const);

	return (
		<span
			{...semantics}
			data-slot="spinner"
			className={cn("@container-size inline-block size-3.5 shrink-0", className)}
			{...props}
		>
			<span className="flex size-full items-center justify-center text-[length:100cqmin]">{loader}</span>
		</span>
	);
}

export { Spinner, type SpinnerProps };
