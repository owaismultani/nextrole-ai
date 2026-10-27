import type { Salary } from "./types";
import type { Employment, Workplace } from "@reactive-resume/schema/career";
import { htmlToText } from "../web-access/builtin";
import { MAX_CONTENT_CHARS } from "../web-access/contracts";

/** Posting HTML as capped plain text. Some sources escape their HTML ("&lt;p&gt;"), so a second pass removes it. */
export function plainText(html: string | null | undefined): string {
	if (!html) return "";
	let text = htmlToText(html);
	if (/<\/?[a-z][^<>]*>/i.test(text)) text = htmlToText(text);
	return text.slice(0, MAX_CONTENT_CHARS);
}

export const clean = (value: unknown, max = 200): string =>
	typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";

/** Joins place parts, skipping blanks and repeats ("Berlin, Berlin, Germany" reads "Berlin, Germany"). */
export const place = (...parts: unknown[]) =>
	[...new Set(parts.map((part) => clean(part)).filter(Boolean))].join(", ").slice(0, 200);

/** Reads the many spellings sources use: "Full Time", "FullTime", "fulltime_permanent", "Contractor", "Intern". */
export function employmentOf(value: unknown): Employment | null {
	const text = clean(value)
		.toLowerCase()
		.replace(/[\s_-]+/g, "");
	if (!text) return null;
	if (text.includes("intern") || text.includes("praktik") || text.includes("trainee")) return "internship";
	if (text.includes("parttime") || text.includes("teilzeit")) return "part-time";
	if (text.includes("fulltime") || text.includes("vollzeit")) return "full-time";
	if (text.includes("contract") || text.includes("freelance")) return "contract";
	if (text.includes("temp")) return "temporary";
	return null;
}

const REMOTE = /\b(?:remote|work from home|wfh|anywhere|home ?office|telecommut\w*)\b/i;
const HYBRID = /\bhybrid\b/i;

/** Explicit flags win; otherwise the title and location say "remote" or "hybrid", or the posting stays unknown. */
export function workplaceOf(flags: { remote?: unknown; hybrid?: unknown; onsite?: unknown }, ...text: unknown[]) {
	if (flags.hybrid === true) return "hybrid" satisfies Workplace;
	if (flags.remote === true) return "remote" satisfies Workplace;
	if (flags.onsite === true) return "onsite" satisfies Workplace;
	const words = text.map((part) => clean(part, 500)).join(" ");
	if (HYBRID.test(words)) return "hybrid" satisfies Workplace;
	if (REMOTE.test(words)) return "remote" satisfies Workplace;
	return null;
}

const number = (value: unknown) => {
	const parsed = typeof value === "string" ? Number(value.replace(/[^\d.]/g, "")) : value;
	return typeof parsed === "number" && Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

export function salaryOf(min: unknown, max: unknown, currency: unknown, period: unknown): Salary | null {
	const low = number(min);
	const high = number(max);
	if (low === null && high === null) return null;
	const unit = clean(period).toLowerCase();
	return {
		min: low,
		max: high,
		currency: /^[A-Za-z]{3}$/.test(clean(currency)) ? clean(currency).toUpperCase() : null,
		period: /hour|stunde/.test(unit) ? "hour" : /month|monat/.test(unit) ? "month" : "year",
	};
}

/** Seconds, milliseconds or an ISO string; null when unreadable or in the future by more than a day. */
export function dateOf(value: unknown): Date | null {
	const date =
		typeof value === "number"
			? new Date(value < 1e12 ? value * 1000 : value)
			: typeof value === "string" && value.trim()
				? new Date(/^\d+$/.test(value.trim()) ? Number(value) * 1000 : value)
				: null;
	if (!date || Number.isNaN(date.getTime()) || date.getTime() > Date.now() + 86_400_000) return null;
	return date;
}

/** A source's own address for a posting, accepted only when it is a plain https URL. */
export function httpsUrl(value: unknown): string | null {
	try {
		const url = new URL(clean(value, 2000));
		return url.protocol === "https:" && !url.username && !url.password ? url.toString() : null;
	} catch {
		return null;
	}
}
