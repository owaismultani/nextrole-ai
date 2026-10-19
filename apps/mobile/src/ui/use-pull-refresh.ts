import { useRef, useState } from "react";

/** Pull feedback belongs to the gesture, never to background query activity. */
export function usePullRefresh(...refetches: Array<() => Promise<unknown>>) {
	const [refreshing, setRefreshing] = useState(false);
	const busy = useRef(false);
	const onRefresh = async () => {
		if (busy.current) return;
		busy.current = true;
		setRefreshing(true);
		try {
			await Promise.all([
				new Promise<void>((resolve) => setTimeout(resolve, 400)),
				Promise.allSettled(refetches.map((refetch) => Promise.resolve().then(refetch))),
			]);
		} finally {
			busy.current = false;
			setRefreshing(false);
		}
	};
	return { refreshing, onRefresh };
}
