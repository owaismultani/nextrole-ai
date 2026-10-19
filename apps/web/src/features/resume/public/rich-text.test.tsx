// @vitest-environment happy-dom

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RichText } from "./rich-text";

describe("RichText", () => {
	it("never runs the owner's markup", () => {
		const { container } = render(
			<RichText
				html={
					'<p onclick="alert(1)">Hi<img src=x onerror="alert(1)"><script>alert(1)</script><a href="javascript:alert(1)">x</a></p>'
				}
			/>,
		);
		expect(container.querySelector("img, script, [onclick]")).toBeNull();
		expect(container.querySelector("a")).toBeNull();
		expect(container.textContent).toBe("Hix");
	});
});
