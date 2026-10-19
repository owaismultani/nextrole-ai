import type { ResumeData } from "@reactive-resume/schema/resume/data";
import { ORPCError } from "@orpc/client";
import { SEMANTIC_CSS_LIMITS_V1 } from "@reactive-resume/resume/stylesheet";
import { parseResumeData } from "@reactive-resume/schema/resume/data";
import { syncResumeDates, upgradeResumeDates } from "@reactive-resume/schema/resume/dates";
import { parseResumeDataForWrite } from "@reactive-resume/schema/resume/write";

function parseApiResumeData(data: unknown, code: "BAD_REQUEST" | "INTERNAL_SERVER_ERROR", message: string): ResumeData {
	try {
		const parsed = code === "BAD_REQUEST" ? parseResumeDataForWrite(data) : parseResumeData(data);
		const source = parsed.metadata.stylesheet?.source.text;
		if (source !== undefined && new TextEncoder().encode(source).byteLength > SEMANTIC_CSS_LIMITS_V1.maxSourceBytes) {
			throw new Error("The stylesheet source exceeds the Semantic CSS byte limit.");
		}
		return parsed;
	} catch (cause) {
		throw new ORPCError(code, {
			status: code === "BAD_REQUEST" ? 400 : 500,
			message,
			cause,
		});
	}
}

/** Validates data before it's saved, then writes each entry's date text from its structured dates. */
export const parseWritableResumeData = (data: unknown) => {
	const parsed = parseApiResumeData(data, "BAD_REQUEST", "Resume data does not match the canonical schema.");
	upgradeResumeDates(parsed);
	syncResumeDates(parsed);
	return parsed;
};

export const parseStoredResumeData = (data: unknown) =>
	parseApiResumeData(data, "INTERNAL_SERVER_ERROR", "Stored resume data does not match the canonical schema.");
