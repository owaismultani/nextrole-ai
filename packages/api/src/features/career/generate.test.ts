import { describe, expect, it } from "vitest";
import { stripQuoted } from "./generate";

describe("pasted employer messages", () => {
	it("preserves a full email's current body and removes later quoted headers", () => {
		expect(
			stripQuoted(
				"From: Recruiter <recruiter@example.test>\nSent: Tuesday\nTo: Alice\nSubject: Invitation\n\nCan you do Tuesday?\n\nFrom: Alice\nOld message",
			),
		).toBe("Can you do Tuesday?");
	});
	it("returns no body for headers alone", () => {
		expect(stripQuoted("From: Recruiter\nSubject: Invitation")).toBe("");
	});
	it.each([
		["a signature", "Can you do Tuesday?\n\n-- \nMaya Example\nRecruiter, ACME"],
		[
			"quoted history",
			"Can you do Tuesday?\n\nOn Mon, 5 Oct 2026 at 10:00, Alice <alice@example.test> wrote:\n> My notes",
		],
		[
			"a forwarded header",
			"Can you do Tuesday?\r\n> Earlier line\r\nFrom: Maya Example <maya@acme.test>\r\nSent: Monday",
		],
	])("drops %s before the message is sent to the model", (_, message) => {
		expect(stripQuoted(message)).toBe("Can you do Tuesday?");
	});
});
