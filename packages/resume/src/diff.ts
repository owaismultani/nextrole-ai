import type { ResumeData } from "@reactive-resume/schema/resume/data";
import { diffWordsWithSpace } from "diff";
import { htmlToMarkdown } from "./markdown";

// ---- Text ----

/** A run of text in a comparison: in both versions, only in the newer one, or only in the older one. */
export type TextPart = { value: string; change: "same" | "added" | "removed" };

/** One field that differs, by its key (the app names it), with both values as plain text and the words that moved. */
export type FieldChange = { key: string; before: string; after: string; parts: TextPart[] };

/** Rich text as readable lines (bullets stay bullets); plain strings pass through. */
export function readable(value: string) {
	const text = value.includes("<") ? htmlToMarkdown(value) : value;
	return text
		.replace(/\*\*|__/g, "")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

export function diffText(before: string, after: string): TextPart[] {
	return diffWordsWithSpace(before, after).map((part) => ({
		value: part.value,
		change: part.added ? "added" : part.removed ? "removed" : "same",
	}));
}

const field = (key: string, before: string, after: string): FieldChange[] =>
	before === after ? [] : [{ key, before, after, parts: diffText(before, after) }];

/** Compares two flat maps of fields, in the order the keys first appear. */
const fields = (before: Map<string, string>, after: Map<string, string>) =>
	[...new Set([...before.keys(), ...after.keys()])].flatMap((key) =>
		field(key, before.get(key) ?? "", after.get(key) ?? ""),
	);

// ---- Resumes ----

/** Kept out of content comparison: identity, derived dates (`period` carries them as text) and decoration. */
const SKIPPED = new Set(["id", "dates", "icon", "iconColor", "options"]);

/** An item's fields as text: rich text made readable, lists joined, links flattened, flags as ✓ / –. */
function flatten(item: Record<string, unknown>, prefix = ""): Map<string, string> {
	const out = new Map<string, string>();
	for (const [key, value] of Object.entries(item)) {
		if (SKIPPED.has(key)) continue;
		const name = prefix + key;
		if (typeof value === "string") out.set(name, readable(value));
		else if (typeof value === "number") out.set(name, String(value));
		else if (typeof value === "boolean") out.set(name, value ? "✓" : "–");
		else if (Array.isArray(value))
			out.set(
				name,
				value
					.map((entry) =>
						typeof entry === "string"
							? entry
							: entry && typeof entry === "object"
								? [...flatten(entry as Record<string, unknown>).values()].filter(Boolean).join(" · ")
								: "",
					)
					.filter(Boolean)
					.join(", "),
			);
		else if (value && typeof value === "object")
			for (const [inner, text] of flatten(value as Record<string, unknown>, `${name}.`)) out.set(inner, text);
	}
	return out;
}

const TITLE_KEYS = [
	"name",
	"position",
	"title",
	"company",
	"school",
	"organization",
	"network",
	"language",
	"awarder",
	"issuer",
	"publisher",
	"content",
];

/** Where an entry happened, added after its name ("Senior Engineer · Lumen"). */
const PLACE_KEYS = ["company", "school", "organization", "issuer", "awarder", "publisher"];

const text = (item: Record<string, unknown>, key: string) => {
	const value = item[key];
	return typeof value === "string" ? (readable(value).split("\n")[0] ?? "").trim() : "";
};

/** What an entry is called in a comparison: its first filled-in naming field, and where, when that differs. */
function itemTitle(item: Record<string, unknown>) {
	const key = TITLE_KEYS.find((candidate) => text(item, candidate));
	if (!key) return "";
	const place = PLACE_KEYS.filter((candidate) => candidate !== key).find((candidate) => text(item, candidate));
	return [text(item, key), place ? text(item, place) : ""].filter(Boolean).join(" · ").slice(0, 100);
}

export type ItemChange = {
	id: string;
	status: "added" | "removed" | "changed";
	title: string;
	/** For a changed entry, what changed; for an added or removed one, what it holds. */
	fields: FieldChange[];
};

export type SectionChange = {
	/** The built-in section's id (experience, skills…) or a custom section's id. */
	id: string;
	/** The section's own title; empty for a built-in section that uses its default name. */
	title: string;
	custom: boolean;
	status: "added" | "removed" | "changed";
	/** The section's title or visibility. */
	fields: FieldChange[];
	items: ItemChange[];
	/** Entries in both versions appear in a different order. */
	reordered: boolean;
};

export type ResumeDiff = {
	basics: FieldChange[];
	summary: FieldChange[];
	sections: SectionChange[];
	/** Template, typography, colours, layout or picture changed. */
	design: boolean;
	/** How many things changed, for a one-line summary. */
	total: number;
};

type Section = { title?: string; hidden?: boolean; items: Record<string, unknown>[] };

function diffSection(id: string, custom: boolean, before?: Section, after?: Section): SectionChange | null {
	const older = before?.items ?? [];
	const newer = after?.items ?? [];
	const olderById = new Map(older.map((item) => [String(item.id), item]));
	const newerById = new Map(newer.map((item) => [String(item.id), item]));
	const describe = (item: Record<string, unknown>, status: "added" | "removed"): ItemChange => {
		const values = flatten(item);
		const empty = new Map<string, string>();
		return {
			id: String(item.id),
			status,
			title: itemTitle(item),
			fields: status === "added" ? fields(empty, values) : fields(values, empty),
		};
	};

	const items: ItemChange[] = [];
	for (const item of newer) {
		const previous = olderById.get(String(item.id));
		if (!previous) {
			items.push(describe(item, "added"));
			continue;
		}
		const changed = fields(flatten(previous), flatten(item));
		if (changed.length) items.push({ id: String(item.id), status: "changed", title: itemTitle(item), fields: changed });
	}
	for (const item of older) if (!newerById.has(String(item.id))) items.push(describe(item, "removed"));

	const shared = (list: Record<string, unknown>[], other: Map<string, unknown>) =>
		list.map((item) => String(item.id)).filter((key) => other.has(key));
	const reordered = shared(older, newerById).join() !== shared(newer, olderById).join();

	const sectionFields = [
		...field("title", before?.title ?? "", after?.title ?? ""),
		...(before && after ? field("hidden", before.hidden ? "✓" : "–", after.hidden ? "✓" : "–") : []),
	];
	if (before && after && !items.length && !reordered && !sectionFields.length) return null;
	return {
		id,
		title: after?.title || before?.title || "",
		custom,
		status: !before ? "added" : !after ? "removed" : "changed",
		fields: before && after ? sectionFields : [],
		items,
		reordered: Boolean(before && after && reordered),
	};
}

/** What changed from `before` to `after`, section by section, entries matched by id. Design changes are only flagged. */
export function diffResumes(before: ResumeData, after: ResumeData): ResumeDiff {
	const { customFields: olderFields, ...olderBasics } = before.basics;
	const { customFields: newerFields, ...newerBasics } = after.basics;
	const basics = [
		...fields(flatten(olderBasics), flatten(newerBasics)),
		...field(
			"customFields",
			olderFields.map((item) => item.text).join(", "),
			newerFields.map((item) => item.text).join(", "),
		),
	];
	const summary = [
		...field("content", readable(before.summary.content), readable(after.summary.content)),
		...field("title", before.summary.title, after.summary.title),
		...field("hidden", before.summary.hidden ? "✓" : "–", after.summary.hidden ? "✓" : "–"),
	];

	const sections: SectionChange[] = [];
	for (const id of Object.keys(after.sections) as (keyof ResumeData["sections"])[]) {
		const change = diffSection(
			id,
			false,
			before.sections[id] as unknown as Section,
			after.sections[id] as unknown as Section,
		);
		if (change) sections.push(change);
	}
	const olderCustom = new Map(before.customSections.map((section) => [section.id, section]));
	const newerCustom = new Map(after.customSections.map((section) => [section.id, section]));
	for (const section of after.customSections) {
		const change = diffSection(
			section.id,
			true,
			olderCustom.get(section.id) as unknown as Section | undefined,
			section as unknown as Section,
		);
		if (change) sections.push(change);
	}
	for (const section of before.customSections)
		if (!newerCustom.has(section.id)) {
			const change = diffSection(section.id, true, section as unknown as Section, undefined);
			if (change) sections.push(change);
		}

	const design =
		JSON.stringify(before.metadata) !== JSON.stringify(after.metadata) ||
		JSON.stringify(before.picture) !== JSON.stringify(after.picture);
	const total =
		basics.length +
		summary.length +
		sections.reduce(
			(sum, section) =>
				sum +
				(section.status === "changed" ? section.items.length + section.fields.length + Number(section.reordered) : 1),
			0,
		) +
		Number(design);
	return { basics, summary, sections, design, total };
}

// ---- Letters ----

/** What a letter comparison reads: the fields that make the letter read the way it did. */
export type LetterSnapshot = {
	name: string;
	recipient: string;
	content: string;
	greeting?: string | null;
	signOff?: string | null;
	recipientName: string;
	recipientCompany: string;
	letterDate: string | null;
	style?: unknown;
	layout?: unknown;
};

export type LetterDiff = {
	/** The body word by word, both versions interleaved. */
	body: TextPart[];
	bodyChanged: boolean;
	words: { before: number; after: number };
	/** Name, recipient, greeting, sign-off and date. */
	fields: FieldChange[];
	/** The letter's style or layout changed. */
	design: boolean;
	total: number;
};

const countWords = (text: string) => (text.trim() ? text.trim().split(/\s+/).length : 0);

export function diffLetters(before: LetterSnapshot, after: LetterSnapshot): LetterDiff {
	const older = readable(before.content);
	const newer = readable(after.content);
	const changed = [
		...field("name", before.name, after.name),
		...field("recipientName", before.recipientName, after.recipientName),
		...field("recipientCompany", before.recipientCompany, after.recipientCompany),
		...field("recipient", readable(before.recipient), readable(after.recipient)),
		...field("greeting", before.greeting ?? "", after.greeting ?? ""),
		...field("signOff", before.signOff ?? "", after.signOff ?? ""),
		...field("letterDate", before.letterDate ?? "", after.letterDate ?? ""),
	];
	const design =
		JSON.stringify(before.style ?? null) !== JSON.stringify(after.style ?? null) ||
		JSON.stringify(before.layout ?? null) !== JSON.stringify(after.layout ?? null);
	const bodyChanged = older !== newer;
	return {
		body: diffText(older, newer),
		bodyChanged,
		words: { before: countWords(older), after: countWords(newer) },
		fields: changed,
		design,
		total: changed.length + Number(bodyChanged) + Number(design),
	};
}
