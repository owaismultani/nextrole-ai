import { escapeHtml } from "@reactive-resume/utils/string";
/**
 * Converts a plain-text summary and optional highlights array into an escaped HTML description.
 * Summary becomes a <p> tag, highlights become a <ul> list.
 */
export function toHtmlDescription(summary?: string, highlights?: string[]): string {
	return (summary ? `<p>${escapeHtml(summary)}</p>` : "") + arrayToHtmlList(highlights ?? []);
}

/**
 * Converts an array of plain-text strings into an escaped HTML unordered list.
 */
export function arrayToHtmlList(items: string[]): string {
	if (items.length === 0) return "";
	return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

export const BULLET_PATTERN = /^\s*[-–—•*◦‣·]\s+/;

/**
 * Converts plain-text lines into escaped HTML: a <ul> when most lines are bullets, otherwise one <p> per line.
 */
export function toHtml(lines: string[]): string {
	const cleaned = lines.map((line) => line.trim()).filter(Boolean);
	if (cleaned.length === 0) return "";

	const bulleted = cleaned.filter((line) => BULLET_PATTERN.test(line));
	if (bulleted.length >= 2 && bulleted.length * 2 >= cleaned.length) {
		return arrayToHtmlList(cleaned.map((line) => line.replace(BULLET_PATTERN, "")));
	}

	return cleaned.map((line) => `<p>${escapeHtml(line.replace(BULLET_PATTERN, ""))}</p>`).join(""); // nosemgrep
}
