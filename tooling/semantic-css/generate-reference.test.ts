import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";
import { compileStylesheet } from "@reactive-resume/resume/stylesheet";
import { buildGeneratedDocumentation } from "./generate-reference";

const defaultDocumentationPaths = {
	jsonSchemaGuide: fileURLToPath(new URL("../../docs/guides/json-resume-schema.mdx", import.meta.url)),
	skillSchemaReference: fileURLToPath(
		new URL("../../plugins/reactive-resume/skills/resume-builder/references/schema.md", import.meta.url),
	),
};
const applyingCustomStylesGuide = fileURLToPath(new URL("../../docs/applying-custom-styles.mdx", import.meta.url));

type SemanticCssExample = { label: string; source: string };

const readTargets = (paths: typeof defaultDocumentationPaths) =>
	Promise.all(Object.values(paths).map((path) => readFile(path, "utf8")));

function extractSemanticCssExamples(source: string): SemanticCssExample[] {
	const examples: SemanticCssExample[] = [];
	// A fence inside a list item is indented; its content and closing fence share the opening fence's indent.
	const matches = source.matchAll(/^([ \t]*)```css\r?\n([\s\S]*?)\r?\n\1```/gm);

	for (const [, indent = "", example] of matches) {
		if (!example) throw new Error("Invalid Semantic CSS example.");
		const text = example.replace(new RegExp(`^${indent}`, "gm"), "");
		examples.push({ label: `example ${examples.length + 1}`, source: text });
	}

	return examples;
}

it("keeps every committed generated document synchronized", async () => {
	const [jsonSchemaGuide, skillSchemaReference] = await readTargets(defaultDocumentationPaths);

	expect(await buildGeneratedDocumentation(defaultDocumentationPaths)).toEqual({
		jsonSchemaGuide,
		skillSchemaReference,
	});
});

it("compiles every Semantic CSS example in the public guide", async () => {
	const source = await readFile(applyingCustomStylesGuide, "utf8");
	const examples = extractSemanticCssExamples(source);
	expect(examples).not.toEqual([]);

	for (const example of examples) {
		const result = compileStylesheet({ languageVersion: 1, text: example.source });
		expect(result.program, example.label).not.toBeNull();
		expect(
			result.diagnostics.filter(({ severity }) => severity === "error"),
			example.label,
		).toEqual([]);
	}
});
