import type { ResumeData } from "./resume/data";

/**
 * What a baseline resume needs before documents are tailored from it. These are the parts the tailoring and cover
 * letter steps read; a missing one is a warning the person can fix in the editor, never a hard stop.
 */
export const BASELINE_CHECKS = [
	"name",
	"email",
	"headline",
	"summary",
	"experience",
	"experience-dates",
	"experience-detail",
	"education",
	"skills",
] as const;
export type BaselineCheckKey = (typeof BASELINE_CHECKS)[number];

export type BaselineCheck = {
	key: BaselineCheckKey;
	ok: boolean;
	/** How many entries are affected, for the entry checks. */
	count: number;
	/** The section a fix link opens in the editor. */
	section: "basics" | "summary" | "experience" | "education" | "skills";
};

const plain = (html: string) =>
	html
		.replace(/<[^>]*>/g, " ")
		.replace(/&nbsp;/g, " ")
		.replace(/\s+/g, " ")
		.trim();

const visible = <T extends { hidden: boolean }>(items: T[]) => items.filter((item) => !item.hidden);

/** Structural completeness of a resume, independent of its design or ATS rules. */
export function checkBaseline(data: ResumeData): BaselineCheck[] {
	const experience = visible(data.sections.experience.items);
	const undated = experience.filter((item) => !item.period.trim() && !item.dates).length;
	// A role with fewer than five words says too little to tailor from.
	const thin = experience.filter((item) => plain(item.description).split(" ").filter(Boolean).length < 5).length;
	return [
		{ key: "name", ok: Boolean(data.basics.name.trim()), count: 0, section: "basics" },
		{ key: "email", ok: /\S+@\S+\.\S+/.test(data.basics.email), count: 0, section: "basics" },
		{ key: "headline", ok: Boolean(data.basics.headline.trim()), count: 0, section: "basics" },
		{ key: "summary", ok: plain(data.summary.content).length >= 20, count: 0, section: "summary" },
		{ key: "experience", ok: experience.length > 0, count: experience.length, section: "experience" },
		{ key: "experience-dates", ok: undated === 0, count: undated, section: "experience" },
		{ key: "experience-detail", ok: thin === 0, count: thin, section: "experience" },
		{
			key: "education",
			ok: visible(data.sections.education.items).length > 0,
			count: visible(data.sections.education.items).length,
			section: "education",
		},
		{
			key: "skills",
			ok: visible(data.sections.skills.items).some((item) => item.name.trim()),
			count: visible(data.sections.skills.items).length,
			section: "skills",
		},
	];
}

/** The search a baseline suggests: its headline, and its location when it has one. */
export function suggestQuery(data: ResumeData) {
	return [data.basics.headline.trim(), data.basics.location.trim()].filter(Boolean).join(" ");
}
