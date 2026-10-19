import { describe, expect, it } from "vitest";
import { MCP_TOOL_NAME } from "./mcp-tool-names";
import { TOOL_META } from "./tool-meta";

describe("tool annotations", () => {
	it("marks tools that replace or remove existing data as destructive", () => {
		for (const name of [
			MCP_TOOL_NAME.patchResume,
			MCP_TOOL_NAME.updateResume,
			MCP_TOOL_NAME.deleteResume,
			MCP_TOOL_NAME.updateApplication,
			MCP_TOOL_NAME.deleteApplication,
			MCP_TOOL_NAME.updateApplicationTimelineEntry,
			MCP_TOOL_NAME.updateApplicationInterview,
			MCP_TOOL_NAME.bulkUpdateApplications,
			MCP_TOOL_NAME.bulkDeleteApplications,
			MCP_TOOL_NAME.attachApplicationDocument,
			MCP_TOOL_NAME.removeApplicationDocument,
			MCP_TOOL_NAME.scoreApplicationMatch,
			MCP_TOOL_NAME.tailorResumeForApplication,
			MCP_TOOL_NAME.updateCoverLetter,
			MCP_TOOL_NAME.refreshCoverLetterStyle,
			MCP_TOOL_NAME.deleteCoverLetter,
		]) {
			expect(TOOL_META[name].annotations.readOnlyHint, name).toBe(false);
			expect(TOOL_META[name].annotations.destructiveHint, name).toBe(true);
		}
	});
});
