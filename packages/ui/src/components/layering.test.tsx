import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AlertDialog, AlertDialogContent, AlertDialogTitle } from "./alert-dialog";
import { Dialog, DialogContent, DialogTitle } from "./dialog";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

/** Reads the Tailwind `z-N` / `z-[N]` class of an element. */
function zIndex(element: Element | null): number {
	const match = element?.className.toString().match(/(?:^|\s)z-\[?(\d+)\]?(?:\s|$)/);
	if (!match?.[1]) throw new Error(`No z-index class on ${element?.outerHTML.slice(0, 120)}`);
	return Number(match[1]);
}

// A phone-width dialog covers the whole screen, so anything it opens has to stack above its popup.
describe("Overlay layering", () => {
	it("stacks floating popups above an open dialog", () => {
		render(
			<Dialog defaultOpen>
				<DialogContent>
					<DialogTitle>Add provider</DialogTitle>
					<Popover defaultOpen>
						<PopoverTrigger>Provider</PopoverTrigger>
						<PopoverContent>Options</PopoverContent>
					</Popover>
				</DialogContent>
			</Dialog>,
		);

		const dialog = screen.getByRole("dialog", { name: "Add provider" });
		const positioner = screen.getByText("Options").closest("[data-slot=popover-content]")?.parentElement ?? null;
		expect(zIndex(positioner)).toBeGreaterThan(zIndex(dialog));
	});

	it("stacks a confirmation opened from a dialog above that dialog", () => {
		render(
			<Dialog defaultOpen>
				<DialogContent>
					<DialogTitle>Edit provider</DialogTitle>
					<AlertDialog defaultOpen>
						<AlertDialogContent>
							<AlertDialogTitle>Delete provider?</AlertDialogTitle>
						</AlertDialogContent>
					</AlertDialog>
				</DialogContent>
			</Dialog>,
		);

		// The confirmation hides its parent from the accessibility tree, so find the parent by slot.
		const dialog = document.querySelector("[data-slot=dialog-content]");
		const confirm = screen.getByRole("alertdialog", { name: "Delete provider?" });
		// Equal layers stack by DOM order, and the confirmation portals in after its parent.
		expect(zIndex(confirm)).toBeGreaterThanOrEqual(zIndex(dialog));
	});
});
