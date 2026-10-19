import type { AtsRuleCode } from "./catalog";

export type AtsSeverity = "error" | "warning" | "info";

/** The groups Check shows its rules in: contact details, dates, layout, section headings and writing. */
export type AtsCategory = "contact" | "dates" | "layout" | "headings" | "writing";

export type AtsFindingParams = Readonly<Record<string, string | number>>;

export type AtsFinding = {
	code: AtsRuleCode;
	severity: AtsSeverity;
	/** JSON pointer to the value, with array indexes (`/sections/experience/items/0/period`). */
	pointer: string;
	/**
	 * Identifies the finding across edits: the code and the pointer with each array index replaced by the
	 * entry's id where it has one (`MALFORMED_URL:/sections/experience/items/#a1b2/website/url`), so moving
	 * entries doesn't change it. Ignored findings are stored by this key.
	 */
	key: string;
	params?: AtsFindingParams;
};

export type AtsCategoryScore = {
	/** Rules in the category that apply to this resume. */
	total: number;
	/** Those with no open finding. */
	passed: number;
};

export type AtsReport = {
	/** Open findings, most severe first. */
	findings: readonly AtsFinding[];
	/** Findings the author chose to ignore (`metadata.check.ignored`). They don't count against the score. */
	ignored: readonly AtsFinding[];
	/** Open findings by severity. */
	counts: Readonly<Record<AtsSeverity, number>>;
	/** Rules that apply to this resume: all of them, less the English heading rule for other languages. */
	totalRules: number;
	/** Applicable rules with no open finding. */
	passedRules: number;
	/** `passedRules / totalRules`, as a whole percentage. */
	score: number;
	categories: Readonly<Record<AtsCategory, AtsCategoryScore>>;
};
