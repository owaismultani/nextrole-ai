import type { EditorMode } from "@/features/resume/editor/store";
import { getRouteApi } from "@tanstack/react-router";
import { useCallback } from "react";
import { useEditorStore } from "@/features/resume/editor/store";

const routeApi = getRouteApi("/builder/$resumeId");

/**
 * The editor mode lives in the URL (`?mode=design`), so refreshing and deep links keep it. Write is the default.
 * A picked mode shows at once and the URL follows.
 */
export function useEditorMode() {
	const { mode: urlMode = "write" } = routeApi.useSearch();
	const pendingMode = useEditorStore((state) => state.pendingMode);
	const navigate = routeApi.useNavigate();

	const setMode = useCallback(
		(next: EditorMode) => {
			useEditorStore.setState({ pendingMode: next });
			void navigate({
				to: ".",
				resetScroll: false,
				search: (current: ReturnType<typeof routeApi.useSearch>) => ({
					...current,
					mode: next === "write" ? undefined : next,
				}),
				replace: true,
			}).finally(() => {
				// A later pick may still be on its way; only the latest one hands over to the URL.
				useEditorStore.setState((state) => (state.pendingMode === next ? { pendingMode: null } : state));
			});
		},
		[navigate],
	);

	return [pendingMode ?? urlMode, setMode] as const;
}
