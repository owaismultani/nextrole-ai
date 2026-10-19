import type { Style } from "../../forme/style-types";

type RtlStyleHelpers = {
	rtl: boolean;
	pageDirection: "ltr" | "rtl";
	row: "row" | "row-reverse";
	text: Pick<Style, "direction" | "textAlign">;
	alignEnd: Pick<Style, "textAlign" | "minWidth" | "maxWidth" | "flexShrink">;
	sectionHeadingTextAlign: NonNullable<Style["textAlign"]>;
	headerIdentity: Pick<Style, "textAlign" | "alignItems">;
	listMarkerTextAlign: NonNullable<Style["textAlign"]>;
	gridRowStyle: Style | undefined;
	contactSeparator: (color: string, gap: number) => Style;
	contactSeparatorClear: Style;
	anchorToStart: (offset?: number | string) => Style;
	/** The flex direction of the row that holds a two-column template's columns. */
	columns: "row" | "row-reverse";
	/** Like `anchorToStart`, for the side the template's own sidebar starts from. */
	anchorToColumnStart: (offset?: number | string) => Style;
	/** Left and right padding for a column, given as the template draws it: `start` on its own left. */
	columnInset: (start: number, end: number) => Pick<Style, "paddingLeft" | "paddingRight">;
};

export function createRtlStyleHelpers(rtl: boolean, columnsReversed = rtl): RtlStyleHelpers {
	return {
		columns: columnsReversed ? "row-reverse" : "row",
		anchorToColumnStart: (offset = 0) => (columnsReversed ? { right: offset } : { left: offset }),
		columnInset: (start, end) =>
			columnsReversed ? { paddingLeft: end, paddingRight: start } : { paddingLeft: start, paddingRight: end },
		rtl,
		pageDirection: rtl ? "rtl" : "ltr",
		row: rtl ? "row-reverse" : "row",
		text: rtl ? { direction: "rtl", textAlign: "right" } : {},
		alignEnd: {
			textAlign: rtl ? "left" : "right",
			minWidth: 0,
			maxWidth: "100%",
			flexShrink: 1,
		},
		sectionHeadingTextAlign: rtl ? "right" : "left",
		headerIdentity: rtl
			? { textAlign: "right", alignItems: "flex-end" }
			: { textAlign: "left", alignItems: "flex-start" },
		listMarkerTextAlign: rtl ? "left" : "right",
		gridRowStyle: rtl ? { flexDirection: "row-reverse" } : undefined,
		contactSeparator: (color, gap) =>
			rtl
				? {
						borderLeftWidth: 1,
						borderLeftColor: color,
						paddingLeft: gap,
						marginLeft: gap,
					}
				: {
						borderRightWidth: 1,
						borderRightColor: color,
						paddingRight: gap,
						marginRight: gap,
					},
		contactSeparatorClear: rtl
			? { borderLeftWidth: 0, paddingLeft: 0, marginLeft: 0 }
			: { borderRightWidth: 0, paddingRight: 0, marginRight: 0 },
		anchorToStart: (offset = 0) => (rtl ? { right: offset } : { left: offset }),
	};
}
