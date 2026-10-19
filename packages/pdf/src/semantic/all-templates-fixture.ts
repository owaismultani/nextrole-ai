import type { ResumeData } from "@reactive-resume/schema/resume/data";
import type { Template } from "@reactive-resume/schema/templates";
import { createSampleResumeData } from "@reactive-resume/schema/resume/sample";

const comprehensiveStylesheet = {
	languageVersion: 1,
	text: `@version 1;
:root { --accent: var(--resume-primary-color); }
header > name { color: var(--accent); }
section:is([type="experience"], [type="education"]) > section-heading { text-transform: uppercase; }
section[id="projects"] > section-items > item { padding: 6pt; }
section[id="experience"] item[id="experience-item-2"] field[name="period"] { color: var(--accent); }
rich-text list-item > list-item-content { line-height: 1.25; }
region[placement="sidebar"] section { background-color: rgba(0, 0, 0, 0.04); }
section[type="projects"] { break-inside: avoid; -resume-min-presence-ahead: 24pt; }
@media (max-width: 600pt) { region[placement="sidebar"] section-heading { font-size: 9pt; } }
resume[template="azurill"] template-part[name="timeline-dot"] { background-color: var(--accent); }
`,
} as const;

/** A cover letter, as resumes carried them and as a letter's own document still renders it. */
const LETTER_SECTION: ResumeData["customSections"][number] = {
	title: "Cover Letter",
	icon: "envelope-simple",
	columns: 1,
	hidden: false,
	showHeading: true,
	keepTogether: false,
	startOnNewPage: false,
	id: "019bef5b-0b3d-7e2a-8a7c-12d9e23a4f6b",
	type: "cover-letter",
	items: [
		{
			id: "019bef5b-0f8d-77d1-9b2a-4a1b65e1b8aa",
			hidden: false,
			recipient:
				'<p>Hiring Manager<br />Sunrise Games Studio<br />Seattle, WA<br /><a href="mailto:hiring@sunrisegames.com">hiring@sunrisegames.com</a></p>',
			content:
				"<p>Dear Hiring Manager,</p><p>I'm excited to apply for the Senior Gameplay Engineer role at Sunrise Games Studio. Over the past five years, I have shipped cross-platform titles in Unity and Unreal Engine, leading core gameplay and tooling efforts that improved iteration speed and player experience. At Cascade Studios, I architected combat systems and optimized performance to maintain 60 FPS on console while partnering closely with design and art.</p><p>I thrive in collaborative, cross-disciplinary teams and enjoy mentoring junior engineers. I'd welcome the chance to bring my gameplay systems expertise and tooling focus to your next title.</p><p>Sincerely,<br />David Kowalski</p>",
		},
	],
};

export const buildAllTemplatesFixture = (template: Template) => {
	const data = structuredClone(createSampleResumeData("Semantic CSS Acceptance"));
	data.summary.content = [
		"<h1>Heading</h1>",
		"<blockquote><p>Quote</p></blockquote>",
		"<p><strong>Strong</strong> <em>Emphasis</em> <u>Underline</u> <s>Strike</s> <code>Code</code>",
		'<span style="color: #ff0000">Span</span> <mark data-color="#ffff00">Mark</mark><br>Break</p>',
		"<ul><li>Unordered</li></ul><ol><li>Ordered</li></ol><hr>",
	].join("");
	const firstExperience = data.sections.experience.items[0];
	if (!firstExperience) throw new Error("The comprehensive fixture requires an experience item.");
	firstExperience.roles = [
		{
			id: "experience-role-1",
			position: "Technical Lead",
			period: "2024",
			description: "<p>Led the semantic migration.</p>",
		},
	];
	data.sections.experience.items.push({
		...structuredClone(firstExperience),
		id: "experience-item-2",
		company: "Semantic Systems",
		roles: [],
	});
	const reference = data.sections.references.items[0];
	if (!reference) throw new Error("The comprehensive fixture requires a reference item.");
	reference.position = "Engineering Director";
	reference.phone = "+1 555 0100";
	reference.description = "<p>Available for a reference.</p>";
	for (const certification of data.sections.certifications.items) {
		certification.description = "<p>Verified certification.</p>";
	}
	// Letters render through the same templates, as a cover-letter section; the fixture keeps one to cover it.
	data.customSections.push(LETTER_SECTION);
	data.metadata.layout.pages.push({ fullWidth: true, main: [LETTER_SECTION.id], sidebar: [] });
	data.metadata.template = template;
	data.metadata.stylesheet = {
		mode: "semantic",
		source: comprehensiveStylesheet,
	};
	return data;
};
