// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { androidCallbackIntent } from "./native-callback";
import { Route } from "@/routes/auth/native-callback";

const response = "?code=one%2Btwo%26three&state=state%2Fvalue&iss=https%3A%2F%2Fresume.example%2Fapi%2Fauth";
const intent = `intent://rxresu.me/auth/native-callback${response}#Intent;scheme=https;package=me.rxresu;end`;

beforeEach(() => {
	i18n.loadAndActivate({ locale: "en-US", messages: {} });
	window.history.replaceState(null, "", `/auth/native-callback${response}`);
	vi.spyOn(navigator, "userAgent", "get").mockReturnValue("Mozilla/5.0 (Linux; Android 17)");
	vi.spyOn(window.location, "assign").mockImplementation(() => {});
});

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});

function renderCallback() {
	const Callback = Route.options.component;
	if (!Callback) throw new Error("Native callback route needs a component.");
	return render(
		<I18nProvider i18n={i18n}>
			<Callback />
		</I18nProvider>,
	);
}

describe("native sign-in browser fallback", () => {
	it("opens the Android package directly and keeps the OAuth response out of markup", () => {
		const { container } = renderCallback();
		expect(window.location.assign).toHaveBeenCalledExactlyOnceWith(intent);
		expect(container.innerHTML).not.toContain("code=");
		expect(container.innerHTML).not.toContain("state=");
	});

	it("can retry with a user gesture when the browser blocks automatic opening", () => {
		renderCallback();
		vi.mocked(window.location.assign).mockClear();
		fireEvent.click(screen.getByRole("link", { name: "Try opening the app again" }));
		expect(window.location.assign).toHaveBeenCalledExactlyOnceWith(intent);
	});

	it("returns OAuth errors to the app too", () => {
		window.history.replaceState(null, "", "/auth/native-callback?error=access_denied&state=cancelled");
		renderCallback();
		expect(window.location.assign).toHaveBeenCalledExactlyOnceWith(
			"intent://rxresu.me/auth/native-callback?error=access_denied&state=cancelled#Intent;scheme=https;package=me.rxresu;end",
		);
	});

	it("retains the iOS HTTPS callback without automatically reopening it", () => {
		vi.spyOn(navigator, "userAgent", "get").mockReturnValue("Mozilla/5.0 (iPhone)");
		renderCallback();
		expect(window.location.assign).not.toHaveBeenCalled();
		fireEvent.click(screen.getByRole("link", { name: "Try opening the app again" }));
		expect(window.location.assign).toHaveBeenCalledExactlyOnceWith(window.location.href);
	});

	it("does not automatically launch the app without an authorization response", () => {
		window.history.replaceState(null, "", "/auth/native-callback");
		renderCallback();
		expect(window.location.assign).not.toHaveBeenCalled();
	});

	it("keeps untrusted query values inside the fixed callback and package", () => {
		expect(androidCallbackIntent("?code=x#Intent;scheme=evil;package=other;end")).toBe(
			"intent://rxresu.me/auth/native-callback?code=x%23Intent;scheme=evil;package=other;end#Intent;scheme=https;package=me.rxresu;end",
		);
	});
});
