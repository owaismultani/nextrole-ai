import type { SemanticNode } from "@reactive-resume/resume/stylesheet";
import type { ResumeData } from "@reactive-resume/schema/resume/data";
import type { Template } from "@reactive-resume/schema/templates";
import { describe, expect, it } from "vitest";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { act } from "react";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { ResumeDocument } from "../../document";
import { renderToBuffer } from "../../forme/testing";
import { resolveResumeRuntime } from "../../semantic/resolve";
import { rasterizePdf } from "../../semantic/test/rasterize-pdf";

type SkillLayout = "default" | "inline";
type Placement = "main" | "sidebar";
type LevelDesign = "circle" | "rectangle" | "rectangle-full";

type GengarFixtureOptions = {
	keywordLayout?: "inline" | "list";
	layout?: SkillLayout;
	placement?: Placement;
	columns?: number;
	design?: LevelDesign;
	level?: number;
	custom?: boolean;
};

const required = <T,>(value: T | undefined): T => {
	if (value === undefined) throw new Error("Missing fixture value");
	return value;
};

const gengarFixture = ({
	keywordLayout = "inline",
	layout = "default",
	placement = "main",
	columns = 1,
	design = "rectangle",
	level = 3,
	custom = false,
}: GengarFixtureOptions = {}): ResumeData => {
	const data = structuredClone(defaultResumeData);
	const sectionId = custom ? "custom-skills" : "skills";
	const section = {
		...data.sections.skills,
		title: "Skills",
		icon: "",
		hidden: false,
		columns,
		keywordLayout,
		layout,
		items: [
			{
				id: "skill-0",
				hidden: false,
				icon: "",
				iconColor: "",
				name: "Engineering",
				proficiency: "Experienced",
				level,
				keywords: ["Alpha", "Beta"],
			},
		],
	};

	data.metadata.template = "gengar";
	data.metadata.typography.body.fontFamily = "Helvetica";
	data.metadata.typography.heading.fontFamily = "Helvetica";
	data.metadata.page.hideIcons = true;
	data.metadata.design.colors.primary = "rgba(255, 0, 0, 1)";
	data.metadata.design.level = { type: design, icon: "star" };
	data.metadata.layout.pages = [
		{
			fullWidth: placement === "main",
			main: placement === "main" ? [sectionId] : [],
			sidebar: placement === "sidebar" ? [sectionId] : [],
		},
	];
	if (custom) data.customSections = [{ ...section, id: sectionId, type: "skills" }];
	else data.sections.skills = section;
	return data;
};

const flatten = (node: SemanticNode): SemanticNode[] => [node, ...node.children.flatMap(flatten)];

const getSkillItem = (runtime: ReturnType<typeof resolveResumeRuntime>, id = "skill-0") =>
	flatten(runtime.sourceTree).find((node) => node.kind === "item" && node.id === id);

const renderGengar = async (data: ResumeData, template: Template = "gengar") => {
	const bytes = new Uint8Array(await act(() => renderToBuffer(<ResumeDocument data={data} template={template} />)));
	const loading = getDocument({ data: bytes.slice(), useSystemFonts: true });
	try {
		const pdf = await loading.promise;
		const pages = [];
		for (let index = 1; index <= pdf.numPages; index++) {
			const page = await pdf.getPage(index);
			pages.push((await page.getTextContent()).items.flatMap((item) => ("str" in item ? [item] : [])));
		}
		return { bytes, pages };
	} finally {
		await loading.destroy();
	}
};

describe("Gengar skill rating placement (#2611)", () => {
	it.each([
		{ layout: "default" as const, placement: "main" as const, columns: 1, design: "rectangle" as const, level: 5 },
	])("orders name, rating, proficiency, keywords in $layout/$placement/$design", (options) => {
		const data = gengarFixture(options);
		const runtime = resolveResumeRuntime({ data, template: "gengar" });
		const item = required(getSkillItem(runtime));
		const level = required(item.children.find((node) => node.kind === "level"));
		const header = required(item.children.find((node) => node.kind === "item-header"));

		expect(header.children.map((node) => node.attributes.name)).toEqual(["name"]);
		expect(item.children.map((node) => node.kind)).toEqual(["item-header", "level", "field", "field"]);
		expect(item.children.slice(2).map((node) => node.attributes.name)).toEqual(["proficiency", "keywords"]);
		expect(level.children).toHaveLength(5);
		expect(level.children.every((node) => node.attributes.type === options.design)).toBe(true);
	});

	it("preserves Plan 22 list keywords with Gengar ordering and custom Skills", async () => {
		const data = gengarFixture({ keywordLayout: "list", custom: true, layout: "inline", columns: 2 });
		const result = await renderGengar(data);
		const text = result.pages
			.flat()
			.map((item) => item.str)
			.join(" ");
		expect(text.match(/•/g)).toHaveLength(2);
		expect(text).not.toContain("Alpha, Beta");
		expect(text).toContain("Engineering");
	});

	it("does not change Onyx semantic ordering", () => {
		const data = gengarFixture();
		const runtime = resolveResumeRuntime({ data, template: "onyx" });
		const item = required(getSkillItem(runtime));
		expect(item.children.map((node) => node.kind)).toEqual(["item-header", "field", "field", "level"]);
	});

	it("renders rating band after name in the actual Gengar tree", async () => {
		const data = gengarFixture({ design: "rectangle" });
		const result = await renderGengar(data);
		const text = result.pages.flat().map((item) => item.str);
		const rasters = await rasterizePdf(result.bytes.slice());
		const raster = required(rasters[0]);
		const rows = Array.from({ length: raster.height }, (_, y) => {
			let pixels = 0;
			for (let x = 0; x < raster.width; x++) {
				const offset = (y * raster.width + x) * 4;
				if ((raster.data[offset] ?? 0) > 200 && (raster.data[offset + 1] ?? 255) < 100) pixels++;
			}
			return pixels;
		});
		const ratingBand = rows.findIndex((pixels, y) => pixels > 40 && y > 60 && y < 120);
		const pageText = required(result.pages[0]);
		const nameY = required(pageText.find((item) => item.str === "Engineering")).transform[5];
		const proficiencyY = required(pageText.find((item) => item.str === "Experienced")).transform[5];
		const ratingY = (raster.height - ratingBand) / 1.5;
		expect(ratingBand).toBeGreaterThan(0);
		expect(ratingY).toBeLessThan(nameY);
		expect(ratingY).toBeGreaterThan(proficiencyY);
		expect(text.join(" ")).toContain("Engineering");
		expect(rasters).toHaveLength(1);
	});
});
