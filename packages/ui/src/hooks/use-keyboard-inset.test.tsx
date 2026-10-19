import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useKeyboardInset } from "./use-keyboard-inset";

describe("useKeyboardInset", () => {
	const original = Object.getOwnPropertyDescriptor(window, "visualViewport");
	let viewport: EventTarget & { height: number; offsetTop: number };

	beforeEach(() => {
		viewport = Object.assign(new EventTarget(), { height: window.innerHeight, offsetTop: 0 });
		Object.defineProperty(window, "visualViewport", { configurable: true, value: viewport });
	});

	afterEach(() => {
		if (original) Object.defineProperty(window, "visualViewport", original);
		else Reflect.deleteProperty(window, "visualViewport");
	});

	it("is 0 without a keyboard and follows the keyboard as it opens and closes", () => {
		const { result } = renderHook(() => useKeyboardInset());
		expect(result.current).toBe(0);

		act(() => {
			viewport.height = window.innerHeight - 300;
			viewport.dispatchEvent(new Event("resize"));
		});
		expect(result.current).toBe(300);

		act(() => {
			viewport.offsetTop = 40;
			viewport.dispatchEvent(new Event("scroll"));
		});
		expect(result.current).toBe(260);

		act(() => {
			viewport.height = window.innerHeight;
			viewport.offsetTop = 0;
			viewport.dispatchEvent(new Event("resize"));
		});
		expect(result.current).toBe(0);
	});
});
