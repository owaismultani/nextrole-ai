// @vitest-environment happy-dom

import { afterEach, describe, expect, it } from "vitest";
import { EditorView } from "@codemirror/view";
import { revealStyleRule } from "./editor-extensions";

const views: EditorView[] = [];

afterEach(() => {
	for (const view of views.splice(0)) view.destroy();
});

describe("Semantic CSS editor extensions", () => {
	it("adds a rule for a picked element once, then moves the cursor into it", () => {
		const view = new EditorView({ doc: "header { color: red; }" });
		views.push(view);
		const target = { selector: 'section[id="experience"] item[id="a"]', label: "Experience › Lead */ dev" };

		revealStyleRule(view, target);
		expect(view.state.doc.toString()).toBe(
			'header { color: red; }\n\n/* Experience › Lead *\\/ dev */\nsection[id="experience"] item[id="a"] {\n\t\n}\n',
		);
		const inside = view.state.selection.main.head;
		expect(view.state.doc.sliceString(inside - 1, inside + 2)).toBe("\t\n}");

		view.dispatch({ selection: { anchor: 0 } });
		revealStyleRule(view, target);
		expect(view.state.doc.toString().match(/item\[id="a"\]/g)).toHaveLength(1);
		expect(view.state.selection.main.head).toBe(inside);
	});
});
