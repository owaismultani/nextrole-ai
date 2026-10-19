import type { DialogSchema } from "./schemas";
import { Fragment, lazy, Suspense } from "react";
import { Dialog } from "@reactive-resume/ui/components/dialog";
import { useDialogStore } from "./store";

// The dialogs pull in forms, importers and editors; load them on first open so they stay out of every page's bundle.
const DialogContent = lazy(async () => {
	const { renderDialog } = await import("./renderers");
	return { default: ({ dialog }: { dialog: DialogSchema }) => renderDialog(dialog) };
});

export function DialogManager() {
	const { open, activeDialog, openCount, onOpenChange } = useDialogStore();

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<Fragment key={openCount}>
				{activeDialog && (
					<Suspense>
						<DialogContent dialog={activeDialog} />
					</Suspense>
				)}
			</Fragment>
		</Dialog>
	);
}
