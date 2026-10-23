import { describe, expect, it } from "vitest";
import { sampleResumeData } from "@reactive-resume/schema/resume/sample";
import { diffLetters, diffResumes } from "./diff";

const copy = () => structuredClone(sampleResumeData);

describe("comparing resumes", () => {
	it("finds nothing between identical versions", () => {
		expect(diffResumes(copy(), copy())).toMatchObject({
			basics: [],
			summary: [],
			sections: [],
			design: false,
			total: 0,
		});
	});

	it("shows reworded entries word by word, matched by id", () => {
		const before = copy();
		const after = copy();
		const first = after.sections.experience.items[0];
		if (!first) throw new Error("The sample resume needs an experience entry.");
		first.description = "<p>Led the reliability team.</p>";
		const diff = diffResumes(before, after);
		const [section] = diff.sections;
		expect(section).toMatchObject({ id: "experience", status: "changed", reordered: false });
		expect(section?.items).toHaveLength(1);
		expect(section?.items[0]).toMatchObject({
			id: first.id,
			status: "changed",
			title: `${first.position} · ${first.company}`,
		});
		const change = section?.items[0]?.fields[0];
		expect(change?.key).toBe("description");
		expect(change?.after).toBe("Led the reliability team.");
		expect(change?.parts.some((part) => part.change === "added")).toBe(true);
		expect(diff.total).toBe(1);
	});

	it("reports added and removed entries and a new order", () => {
		const before = copy();
		const after = copy();
		const skills = after.sections.skills.items;
		const removed = skills.pop();
		const template = skills[0];
		if (!removed || !template) throw new Error("The sample resume needs skills.");
		skills.reverse();
		skills.push({ ...template, id: "new-skill", name: "Kubernetes", keywords: ["Helm"] });
		const section = diffResumes(before, after).sections.find((item) => item.id === "skills");
		expect(section?.reordered).toBe(true);
		expect(section?.items.find((item) => item.status === "added")).toMatchObject({
			id: "new-skill",
			title: "Kubernetes",
		});
		expect(section?.items.find((item) => item.status === "removed")).toMatchObject({ id: removed.id });
	});

	it("flags design changes without listing them as content", () => {
		const after = copy();
		after.metadata.template = after.metadata.template === "onyx" ? "azurill" : "onyx";
		expect(diffResumes(copy(), after)).toMatchObject({ sections: [], design: true, total: 1 });
	});

	it("compares the summary and basics as text", () => {
		const after = copy();
		after.summary.content = "<p>New summary.</p>";
		after.basics.headline = "Staff engineer";
		const diff = diffResumes(copy(), after);
		expect(diff.summary.map((change) => change.key)).toEqual(["content"]);
		expect(diff.basics).toEqual([expect.objectContaining({ key: "headline", after: "Staff engineer" })]);
	});
});

describe("comparing letters", () => {
	const letter = {
		name: "Letter",
		recipient: "",
		content: "<p>I build reliable systems.</p><p>Let us talk.</p>",
		greeting: null,
		signOff: null,
		recipientName: "Ada",
		recipientCompany: "Lumen",
		letterDate: null,
		style: { font: "a" },
		layout: { width: 1 },
	};

	it("shows the body word by word and counts words", () => {
		const diff = diffLetters(letter, {
			...letter,
			content: "<p>I build fast, reliable systems.</p><p>Let us talk.</p>",
		});
		expect(diff.bodyChanged).toBe(true);
		expect(diff.words).toEqual({ before: 7, after: 8 });
		expect(
			diff.body
				.filter((part) => part.change === "added")
				.map((part) => part.value)
				.join(""),
		).toContain("fast,");
		expect(diff.fields).toEqual([]);
		expect(diff.total).toBe(1);
	});

	it("lists field and design changes separately from the body", () => {
		const diff = diffLetters(letter, { ...letter, recipientCompany: "Vivid Seats", style: { font: "b" } });
		expect(diff.bodyChanged).toBe(false);
		expect(diff.fields).toEqual([expect.objectContaining({ key: "recipientCompany", before: "Lumen" })]);
		expect(diff.design).toBe(true);
	});
});
