import { describe, expect, it } from "vitest";
import { getLocaleAlternates, localizedUrl } from "./locale";

describe("locale URLs", () => {
	it("keeps the default locale on the plain address and puts others in the locale parameter", () => {
		expect(localizedUrl("https://rxresu.me/?locale=de-DE", "en-US")).toBe("https://rxresu.me/");
		expect(localizedUrl("https://rxresu.me/", "de-DE")).toBe("https://rxresu.me/?locale=de-DE");
	});

	it("lists valid hreflang alternates without the pseudo-locale", () => {
		const alternates = getLocaleAlternates("https://rxresu.me/");

		expect(alternates).toContainEqual({ hreflang: "x-default", href: "https://rxresu.me/" });
		expect(alternates).toContainEqual({ hreflang: "sr", href: "https://rxresu.me/?locale=sr-SP" });
		expect(alternates.map((alternate) => alternate.hreflang)).not.toContain("zu-ZA");
	});
});
