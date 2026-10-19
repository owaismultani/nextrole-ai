import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test } from "vitest";
import { createPortal } from "react-dom";
import { InputGroup, InputGroupAddon, InputGroupInput } from "./input-group";

function PortaledInput() {
	return createPortal(<input aria-label="Portaled input" />, document.body);
}

describe("InputGroupAddon", () => {
	test("does not redirect focus from controls rendered through a portal", async () => {
		const user = userEvent.setup();

		render(
			<InputGroup>
				<InputGroupAddon align="inline-end">
					<span>Addon</span>
					<PortaledInput />
				</InputGroupAddon>

				<InputGroupInput aria-label="Outer input" />
			</InputGroup>,
		);

		const portaledInput = screen.getByLabelText("Portaled input");
		const outerInput = screen.getByLabelText("Outer input");

		await user.click(portaledInput);

		expect(document.activeElement).toBe(portaledInput);
		expect(document.activeElement).not.toBe(outerInput);
	});
});
