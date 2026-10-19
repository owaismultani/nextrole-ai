import type { ExtractedDocument, PdfEvidence } from "./types";

const normalize = (text: string) => text.replace(/\s+/g, " ").trim().toLowerCase();

/**
 * Puts a finding's evidence on the page: its own box when a rule gave one, or else the line whose text holds its
 * snippet (on the finding's page, when it names one). Pages are 1-based; boxes are top-left points.
 */
export function locateEvidence(doc: ExtractedDocument, evidence: PdfEvidence | undefined): PdfEvidence | undefined {
	if (!evidence || evidence.box || !evidence.snippet) return evidence;
	// Long snippets are cut with an ellipsis, and may run over several lines: the start is enough to find them.
	const needle = normalize(evidence.snippet.replace(/…$/, "")).slice(0, 60);
	if (!needle) return evidence;

	const candidates = evidence.page === undefined ? doc.lines : doc.lines.filter((line) => line.page === evidence.page);
	const line =
		candidates.find((candidate) => normalize(candidate.text).includes(needle)) ??
		candidates.find((candidate) => needle.startsWith(normalize(candidate.text)) && candidate.text.trim().length >= 8);
	if (!line) return evidence;

	return { ...evidence, page: line.page, box: { x: line.x, y: line.y, width: line.width, height: line.height } };
}
