import { describe, expect, it } from "vitest";
import { resolveWorkspaceTab, WORKSPACE_TABS, workspaceHintSchema } from "./career";

describe("workspace tabs", () => {
	it("keeps every current tab as it is", () => {
		for (const tab of WORKSPACE_TABS) expect(resolveWorkspaceTab(tab)).toEqual({ tab });
	});

	it("sends each former tab to the work it was for, so old links and notifications still land", () => {
		expect(resolveWorkspaceTab("fit")).toEqual({ tab: "summary" });
		expect(resolveWorkspaceTab("apply")).toEqual({ tab: "answers" });
		// Interview preparation is Interviews, not Documents, even though "prepare" sounds like it.
		expect(resolveWorkspaceTab("prepare")).toEqual({ tab: "interviews", section: "prepare" });
		expect(resolveWorkspaceTab("practise")).toEqual({ tab: "interviews", section: "practise" });
		expect(resolveWorkspaceTab("debrief")).toEqual({ tab: "interviews", section: "debrief" });
	});

	it("does not invent a destination for an unknown name", () => {
		expect(resolveWorkspaceTab("details")).toBeNull();
		expect(resolveWorkspaceTab(undefined)).toBeNull();
	});

	it("still accepts the coach hints older apps send", () => {
		for (const hint of ["fit", "apply", "prepare", "practise", "debrief", "summary", "interviews"])
			expect(workspaceHintSchema.safeParse(hint).success).toBe(true);
		expect(workspaceHintSchema.safeParse("nowhere").success).toBe(false);
	});
});
