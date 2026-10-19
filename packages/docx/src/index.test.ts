// @vitest-environment happy-dom

import { describe, expect, it } from "vitest";
import { sampleResumeData } from "@reactive-resume/schema/resume/sample";
import { buildDocx } from "./index";

describe("buildDocx", () => {
	it("returns a Blob for the sample resume", async () => {
		const blob = await buildDocx(sampleResumeData);
		expect(blob).toBeInstanceOf(Blob);
		expect(blob.size).toBeGreaterThan(0);
	});
});
