import { describe, expect, it } from "vitest";
import { ORPCError } from "@orpc/client";
import { getReadableErrorMessage } from "./error-message";

describe("getReadableErrorMessage", () => {
	it("shows the upload size validation message instead of the generic oRPC error", () => {
		const error = new ORPCError("BAD_REQUEST", {
			message: "Input validation failed",
			data: { issues: [{ message: "File size must be less than 10MB", path: [] }] },
		});
		expect(getReadableErrorMessage(error, "Failed to upload picture.")).toBe("File size must be less than 10MB");
	});

	it("limits validation messages, removes duplicates, and ignores malformed issues", () => {
		const error = new ORPCError("BAD_REQUEST", {
			message: "Input validation failed",
			data: {
				issues: [
					null,
					{},
					{ message: 42 },
					{ message: " " },
					...["First", "First", "Second", "Third", "Fourth"].map((message) => ({ message })),
				],
			},
		});
		expect(getReadableErrorMessage(error, "fallback")).toBe("First Second Third");
	});

	it("returns the message of a plain error object (Better Auth client errors)", () => {
		expect(getReadableErrorMessage({ code: "SESSION_NOT_FRESH", message: "Session is not fresh" }, "fallback")).toBe(
			"Session is not fresh",
		);
	});
});
