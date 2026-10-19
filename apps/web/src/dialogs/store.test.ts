import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDialogStore } from "./store";

describe("useDialogStore", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		// Reset store state between tests
		useDialogStore.setState({ open: false, activeDialog: null, onBeforeClose: null });
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe("closeDialog", () => {
		it.each([false, true])("preserves a replacement dialog and its own closing delay (closing=%s)", (closing) => {
			useDialogStore.getState().openDialog("auth.change-password", undefined);
			useDialogStore.getState().closeDialog();
			vi.advanceTimersByTime(100);

			useDialogStore.getState().openDialog("document.new", undefined);
			const onBeforeClose = () => false;
			useDialogStore.getState().setOnBeforeClose(onBeforeClose);
			if (closing) useDialogStore.getState().closeDialog();
			vi.advanceTimersByTime(200);

			expect(useDialogStore.getState()).toMatchObject({
				open: !closing,
				activeDialog: { type: "document.new" },
				onBeforeClose,
			});

			if (!closing) useDialogStore.getState().closeDialog();
			vi.advanceTimersByTime(300);
			expect(useDialogStore.getState().activeDialog).toBeNull();
			expect(useDialogStore.getState().onBeforeClose).toBeNull();
		});
	});

	describe("onOpenChange", () => {
		it("calls cancel when onBeforeClose returns false", async () => {
			const handler = vi.fn().mockResolvedValue(false);
			const cancel = vi.fn();
			useDialogStore.setState({
				open: true,
				activeDialog: { type: "auth.change-password", data: undefined },
				onBeforeClose: handler,
			});

			useDialogStore.getState().onOpenChange(false, { cancel });
			await vi.waitFor(() => expect(cancel).toHaveBeenCalled());
		});
	});
});
