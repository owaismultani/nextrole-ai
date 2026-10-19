import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./button";

describe("Button", () => {
	it("shows a spinner, sets aria-busy and ignores clicks while loading", async () => {
		const onClick = vi.fn();
		render(
			<Button loading onClick={onClick}>
				Preparing…
			</Button>,
		);
		const button = screen.getByRole("button", { name: "Preparing…" });
		expect(button).toHaveAttribute("aria-busy", "true");
		expect(button.querySelector('[data-slot="spinner"]')).toHaveAttribute("aria-hidden", "true");
		await userEvent.click(button);
		expect(onClick).not.toHaveBeenCalled();
	});
});
