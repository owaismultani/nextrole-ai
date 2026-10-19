import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useBreakpoint } from "./use-breakpoint";

let width = 1440;
const listeners = new Set<() => void>();

Object.defineProperty(window, "matchMedia", {
	writable: true,
	configurable: true,
	value: vi.fn().mockImplementation((query: string) => {
		const min = Number(/min-width: (\d+)px/.exec(query)?.[1] ?? 0);
		return {
			get matches() {
				return width >= min;
			},
			media: query,
			addEventListener: (_: string, listener: () => void) => listeners.add(listener),
			removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
		};
	}),
});

describe("useBreakpoint", () => {
	it("updates when the viewport crosses a breakpoint", () => {
		const { result } = renderHook(() => useBreakpoint());
		expect(result.current).toBe("wide");

		act(() => {
			width = 800;
			for (const listener of listeners) listener();
		});

		expect(result.current).toBe("tablet");
	});
});
