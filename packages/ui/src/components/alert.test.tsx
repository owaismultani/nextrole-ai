import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Alert } from "./alert";

describe("Alert", () => {
	it("announces only errors", () => {
		const { rerender } = render(<Alert variant="error">Couldn't reach OpenAI.</Alert>);
		expect(screen.getByRole("alert")).toHaveTextContent("Couldn't reach OpenAI.");

		rerender(<Alert variant="info">Job match uses the posting from Lumen Health.</Alert>);
		expect(screen.getByText("Job match uses the posting from Lumen Health.")).toBeInTheDocument();
		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
	});
});
