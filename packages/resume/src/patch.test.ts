import { describe, expect, it } from "vitest";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { applyResumePatches, ResumePatchError } from "./patch";

describe("applyResumePatches", () => {
	it("applies multiple ops in sequence", () => {
		const result = applyResumePatches(defaultResumeData, [
			{ op: "replace", path: "/basics/name", value: "Alice" },
			{ op: "replace", path: "/basics/email", value: "alice@example.com" },
		]);

		expect(result.basics.name).toBe("Alice");
		expect(result.basics.email).toBe("alice@example.com");
	});

	it("throws ResumePatchError for unresolvable path", () => {
		expect(() =>
			applyResumePatches(defaultResumeData, [{ op: "replace", path: "/does/not/exist", value: "x" }]),
		).toThrow(ResumePatchError);
	});

	it("throws ResumePatchError for failed test op", () => {
		try {
			applyResumePatches(defaultResumeData, [{ op: "test", path: "/basics/name", value: "wrong-value" }]);
			expect.unreachable();
		} catch (error) {
			expect(error).toBeInstanceOf(ResumePatchError);
			const patchError = error as ResumePatchError;
			expect(patchError.code).toBe("TEST_OPERATION_FAILED");
			expect(patchError.index).toBe(0);
			expect(patchError.message).toContain("Test operation failed");
			expect(patchError.operation).toEqual({ op: "test", path: "/basics/name", value: "wrong-value" });
		}
	});

	it("rolls back if patched document fails schema validation", () => {
		// The tolerant read-time parser would silently replace an unknown template with "onyx";
		// a write must reject it instead (#3413).
		expect(() =>
			applyResumePatches(defaultResumeData, [{ op: "replace", path: "/metadata/template", value: "unknown-template" }]),
		).toThrow(/Patch produced invalid resume data/);
	});
});
