import { useState } from "react";

/**
 * Keeps an overlay's content on screen while it animates closed. Pass what the overlay shows (null when closed),
 * render from the returned value, and hand the returned callback to the overlay Root's `onOpenChangeComplete`.
 * The last non-null value is held through the exit animation and dropped once it has finished, so the next open
 * mounts fresh.
 */
export function useClosingValue<T>(value: T | null): readonly [T | null, (open: boolean) => void] {
	const [held, setHeld] = useState(value);
	if (value !== null && value !== held) setHeld(value);

	const onOpenChangeComplete = (open: boolean) => {
		if (!open) setHeld(null);
	};

	return [value ?? held, onOpenChangeComplete] as const;
}
