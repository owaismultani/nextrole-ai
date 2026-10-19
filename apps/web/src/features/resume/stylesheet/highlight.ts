import type { SemanticNode } from "@reactive-resume/resume/stylesheet";
import { compileSelector, createSelectorMatcher } from "@reactive-resume/resume/stylesheet";

type RuleSpan = { selector: string; from: number; to: number };

/**
 * The style rules in a stylesheet, each spanning from its first character (a comment above the selector counts) to
 * its closing brace. Strings and comments can't open or close a block; at-rule blocks (`@media`) aren't rules
 * themselves, but the rules inside them are.
 */
function ruleSpans(text: string): RuleSpan[] {
	const spans: RuleSpan[] = [];
	const open: { prelude: string; from: number }[] = [];
	let preludeFrom = 0;
	let index = 0;

	while (index < text.length) {
		const character = text[index];
		if (character === "/" && text[index + 1] === "*") {
			const end = text.indexOf("*/", index + 2);
			index = end < 0 ? text.length : end + 2;
			continue;
		}
		if (character === '"' || character === "'") {
			const end = text.indexOf(character, index + 1);
			index = end < 0 ? text.length : end + 1;
			continue;
		}
		if (character === "{") {
			// A comment above the selector (the page-picked label) belongs to the rule.
			const raw = text.slice(preludeFrom, index);
			const prelude = raw.replaceAll(/\/\*[\s\S]*?\*\//g, "").trim();
			open.push({ prelude, from: preludeFrom + raw.length - raw.trimStart().length });
			preludeFrom = index + 1;
		} else if (character === "}") {
			const block = open.pop();
			if (block?.prelude && !block.prelude.startsWith("@"))
				spans.push({ selector: block.prelude, from: block.from, to: index + 1 });
			preludeFrom = index + 1;
		} else if (character === ";") {
			preludeFrom = index + 1;
		}
		index++;
	}
	return spans;
}

/** The node keys matched by the rule the cursor is in (innermost one), or none when it isn't in a rule. */
export function matchedNodeKeys(text: string, offset: number, tree: SemanticNode): string[] {
	const rule = ruleSpans(text)
		.filter((span) => span.from <= offset && offset <= span.to)
		.sort((left, right) => right.from - left.from)[0];
	if (!rule) return [];

	const { selector } = compileSelector(rule.selector);
	if (!selector) return [];
	const matches = createSelectorMatcher(tree);
	const keys: string[] = [];
	const visit = (node: SemanticNode) => {
		if (matches(selector, node.key)) keys.push(node.key);
		for (const child of node.children) visit(child);
	};
	visit(tree);
	return keys;
}
