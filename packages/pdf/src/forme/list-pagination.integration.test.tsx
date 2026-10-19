import assert from "node:assert/strict";
import { expect, it } from "vitest";
import * as forme from "@formepdf/core";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { act } from "react";
import { Document, Page, Text, View } from "./primitives";
import { renderResumeElement } from "./render";

it("reserves every line of a list item moved to the next page", async () => {
	const result = await act(() =>
		renderResumeElement(
			forme,
			<Document>
				<Page size={{ width: 200, height: 150 }} style={{ padding: 10, fontSize: 10, lineHeight: 1.5 }}>
					<View style={{ height: 120 }} />
					<View>
						<View data-resume-list-item style={{ flexDirection: "row", marginBottom: 6 }}>
							<Text data-resume-list-marker style={{ width: 10 }}>
								•
							</Text>
							<View data-resume-list-content style={{ flex: 1 }}>
								<Text>{"First line\nSecond line"}</Text>
							</View>
						</View>
						<View data-resume-list-item style={{ flexDirection: "row" }}>
							<Text data-resume-list-marker style={{ width: 10 }}>
								•
							</Text>
							<View data-resume-list-content style={{ flex: 1 }}>
								<Text>Next item</Text>
							</View>
						</View>
					</View>
				</Page>
			</Document>,
		),
	);
	const loading = getDocument({ data: result.pdf.slice(), useSystemFonts: true });
	try {
		const pdf = await loading.promise;
		expect(pdf.numPages).toBe(2);
		const page = await pdf.getPage(2);
		const lines = (await page.getTextContent()).items
			.filter((item) => "str" in item)
			.filter((item) => item.str.trim() && item.str !== "•");
		expect(lines.map((line) => line.str)).toEqual(["First line", "Second line", "Next item"]);
		const [, second, next] = lines;
		assert(second && next);
		assert(second.transform[5] !== undefined && next.transform[5] !== undefined);
		// PDF coordinates grow upward: the following line's top must stay below the preceding baseline.
		expect(next.transform[5] + next.height).toBeLessThanOrEqual(second.transform[5]);
	} finally {
		await loading.destroy();
	}
});
