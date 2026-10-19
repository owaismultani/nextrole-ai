import type { DialogSchema } from "./schemas";
import { authDialogRenderers } from "./auth/registry";
import { documentDialogRenderers } from "./document/registry";
import { resumeDialogRenderers } from "./resume/registry";

const dialogRendererByType = new Map(
	[...authDialogRenderers, ...documentDialogRenderers, ...resumeDialogRenderers].map(
		(renderer) => [renderer.type, renderer] as const,
	),
);

export const renderDialog = (dialog: DialogSchema | null) => {
	if (!dialog) return null;
	const renderer = dialogRendererByType.get(dialog.type);
	if (renderer) return renderer.render(dialog as never);
	return null;
};
