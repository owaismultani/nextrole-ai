import type { CoverLetterStyle } from "@reactive-resume/schema/cover-letter/data";
import type { SemanticStylesheet } from "@reactive-resume/schema/resume/stylesheet";
import { convertLegacyStylesheet, needsLegacyStyleConversion } from "@reactive-resume/pdf/semantic-legacy";
import { createCoverLetterResumeData } from "@reactive-resume/resume/cover-letter";
import { parseResumeData } from "@reactive-resume/schema/resume/data";

type Metadata = { stylesheet?: unknown; styleRules?: unknown };

/** A stored resume's new stylesheet, or null when it needs none. Throws when the stored data doesn't parse. */
export function migrateResumeStylesheet(data: unknown): SemanticStylesheet | null {
	if (!needsLegacyStyleConversion((data as { metadata?: Metadata } | null)?.metadata)) return null;
	return convertLegacyStylesheet(parseResumeData(data));
}

/** A letter's copy of its resume's style, converted as the letter document it styles. */
export function migrateLetterStylesheet(style: unknown): SemanticStylesheet | null {
	if (!needsLegacyStyleConversion((style as { metadata?: Metadata } | null)?.metadata)) return null;
	const data = createCoverLetterResumeData({ name: "", recipient: "", content: "", style: style as CoverLetterStyle });
	return convertLegacyStylesheet(parseResumeData(data));
}
