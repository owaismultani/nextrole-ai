// @vitest-environment happy-dom
// @vitest-environment-options {"url":"https://localhost:3000"}

import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { i18n } from "@lingui/core";
import Cookies from "js-cookie";
import { DonationToast } from "./donation-toast";

vi.mock("@tanstack/react-router", () => ({ useRouterState: () => "/" }));

const FIVE_MINUTES = 5 * 60 * 1000;
const DISMISSED_COOKIE = "donation-toast-dismissed";

beforeEach(() => {
	vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout", "requestAnimationFrame", "cancelAnimationFrame"] });
	i18n.loadAndActivate({ locale: "en-US", messages: {} });
	Cookies.remove(DISMISSED_COOKIE);
});

afterEach(() => {
	Cookies.remove(DISMISSED_COOKIE);
	vi.useRealTimers();
});

it("asks after five minutes and remembers a dismissal", async () => {
	render(<DonationToast />);

	await act(() => vi.advanceTimersByTimeAsync(FIVE_MINUTES));
	// In the DOM, not "visible": without LazyMotion features loaded, the entrance stays at opacity 0.
	expect(screen.getByText("Enjoying Reactive Resume?")).toBeInTheDocument();

	fireEvent.click(screen.getByRole("button", { name: "Maybe later" }));
	expect(Cookies.get(DISMISSED_COOKIE)).toBe("true");
});
