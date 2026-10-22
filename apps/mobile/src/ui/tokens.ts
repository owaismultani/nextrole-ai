// Desk & Paper tokens for React Native (cool indigo palette from the design handoff; same values as globals.css).
// Screens use these and nothing else; add a missing token here rather than hard-coding a value.
import { Easing, Platform } from "react-native";

export type ColorScheme = "light" | "dark";

// §1 Colours and §1.1 named tints. Alpha is the last two hex digits (#RRGGBBAA).
const light = {
	bg: "#F6F7FA",
	surface: "#FFFFFF",
	raised: "#FFFFFF",
	sunken: "#EFF2F7",
	line: "#E1E6EF",
	line2: "#BDC7D8",
	lineStrong: "#888680",
	ink: "#202B40",
	ink2: "#5E6C83",
	ink3: "#6E7A8F",
	accent: "#5146D9",
	accentHover: "#4035BD",
	onAccent: "#FFFFFF",
	accentSoft: "#EEEDFC",
	accentText: "#4035BD",
	ok: "#16724E",
	okSoft: "#EDF7F1",
	okText: "#16724E",
	danger: "#BA3630",
	dangerSoft: "#FFF1F3",
	dangerText: "#AD344A",
	warn: "#D29922",
	warnSoft: "#FFF8E9",
	warnText: "#865B09",
	infoSoft: "#EDF3FD",
	infoText: "#315E9F",
	hover: "#202B400D",
	press: "#202B4017",
	scrim: "#17161152",
	scrimSheet: "#1716112E",
	paper: "#FFFFFF",
	paperInk: "#1C1B15",
	paperLine: "#DFDEDA",
	paperAccent: "#337344",
	paperWarn: "#D29922",
	paperWarnSoft: "#FCEDCD",
	stageSaved: "#908C7F",
	stageApplied: "#5590CC",
	stageScreen: "#00A0A6",
	stageInterv: "#AF8433",
	stageOffer: "#579F68",
	stageClosed: "#C67067",
	pageSelectFill: "#5146D91F",
	pageSelectLine: "#5146D9",
	pageIssueFill: "#D2992238",
	pageProposalFill: "#5146D91F",
	selectedFill: "#EEEDFC",
};

export type ColorToken = keyof typeof light;
export type Colors = Record<ColorToken, string>;

const dark: Colors = {
	bg: "#111620",
	surface: "#1B2332",
	raised: "#20293A",
	sunken: "#151C29",
	line: "#354056",
	line2: "#59677F",
	lineStrong: "#73726C",
	ink: "#E8EDF6",
	ink2: "#ACB8CD",
	ink3: "#A0ADC3",
	accent: "#B3A6FF",
	accentHover: "#C6BCFF",
	onAccent: "#211A3A",
	accentSoft: "#302B4C",
	accentText: "#C6BCFF",
	ok: "#88DAB2",
	okSoft: "#203A31",
	okText: "#88DAB2",
	danger: "#D9544B",
	dangerSoft: "#3E2935",
	dangerText: "#FFA5B5",
	warn: "#E4B750",
	warnSoft: "#342E23",
	warnText: "#ECC584",
	infoSoft: "#25364F",
	infoText: "#A4C4F5",
	hover: "#FFFFFF0F",
	press: "#FFFFFF1A",
	scrim: "#00000080",
	scrimSheet: "#00000080",
	paper: "#FFFFFF",
	paperInk: "#1C1B15",
	paperLine: "#DFDEDA",
	paperAccent: "#337344",
	paperWarn: "#D29922",
	paperWarnSoft: "#FCEDCD",
	stageSaved: "#908C7F",
	stageApplied: "#5590CC",
	stageScreen: "#00A0A6",
	stageInterv: "#AF8433",
	stageOffer: "#579F68",
	stageClosed: "#C67067",
	pageSelectFill: "#5146D91F",
	pageSelectLine: "#5146D9",
	pageIssueFill: "#D2992238",
	pageProposalFill: "#5146D91F",
	selectedFill: "#302B4C",
};

export const colors: Record<ColorScheme, Colors> = { light, dark };

// §2 Type: DM Sans for text and Manrope for titles (the design handoff's pairing). Custom fonts select weight by family name (Android ignores fontWeight for them), so each weight is its
// own family, loaded under these names in src/ui/fonts.ts.
export const fonts = {
	ui: {
		400: "DMSans-Regular",
		500: "DMSans-Medium",
		600: "DMSans-SemiBold",
		700: "DMSans-Bold",
	},
	/** Titles and metrics (Manrope). */
	display: {
		600: "Manrope-SemiBold",
		700: "Manrope-Bold",
		800: "Manrope-ExtraBold",
	},
	/** The letter thumbnail only: a miniature of the page, which is set in a serif. */
	paper: "Newsreader-Regular",
	mono: Platform.select({ ios: "Menlo", default: "monospace" }),
} as const;

type TextStyleToken = {
	fontFamily: string;
	fontSize: number;
	lineHeight: number;
	letterSpacing: number;
	maxFontSizeMultiplier?: number;
};

export const type = {
	largeIOS: { fontFamily: fonts.display[700], fontSize: 34, lineHeight: 41, letterSpacing: -1.2 },
	largeAnd: { fontFamily: fonts.display[700], fontSize: 28, lineHeight: 34, letterSpacing: -1 },
	display: { fontFamily: fonts.display[700], fontSize: 28, lineHeight: 34, letterSpacing: -1 },
	heading: { fontFamily: fonts.display[700], fontSize: 22, lineHeight: 28, letterSpacing: -0.8 },
	title: { fontFamily: fonts.display[700], fontSize: 17, lineHeight: 22, letterSpacing: -0.6 },
	bodyLarge: { fontFamily: fonts.ui[400], fontSize: 16, lineHeight: 22, letterSpacing: 0 },
	body: { fontFamily: fonts.ui[400], fontSize: 15, lineHeight: 21, letterSpacing: 0 },
	label: { fontFamily: fonts.ui[600], fontSize: 15, lineHeight: 20, letterSpacing: 0 },
	callout: { fontFamily: fonts.ui[400], fontSize: 13, lineHeight: 18, letterSpacing: 0 },
	caption: { fontFamily: fonts.ui[500], fontSize: 12, lineHeight: 16, letterSpacing: 0 },
	micro: { fontFamily: fonts.ui[600], fontSize: 11, lineHeight: 13, letterSpacing: 0.1, maxFontSizeMultiplier: 1.6 },
	mono: { fontFamily: fonts.mono, fontSize: 13, lineHeight: 18, letterSpacing: 0 },
} satisfies Record<string, TextStyleToken>;

/** `pageThumb`: Newsreader 400 that scales with the letter card, 3.3% of its width. */
export const pageThumb = { fontFamily: fonts.paper, widthRatio: 0.033 } as const;

// §3 Spacing, 4 pt grid.
export const space = { s0: 2, s1: 4, s2: 8, s3: 12, s4: 16, s5: 20, s6: 24, s8: 32, s10: 40, s12: 48 } as const;

// §3.1 Sizes.
export const size = {
	hit: 44,
	row: 52,
	input: 46,
	button: 48,
	chip: 32,
	tabBar: 52,
	topBar: 44,
	editorBar: 56,
	newPill: { width: 34, height: 26 },
	grabber: { width: 36, height: 5 },
	sidebar: 240,
	panel: 400,
	formSheet: 540,
	sheetShare: 440,
	sheetDetail: 480,
	/** Phosphor sizes: inline meta 16, list rows 20, toolbars 22, tab bar and nav bar 24. */
	icon: { meta: 16, row: 20, toolbar: 22, bar: 24 },
} as const;

// §4 Radii.
export const radius = {
	rSm: 6,
	rMd: 8,
	rLg: 10,
	rXl: 12,
	r2xl: 16,
	r3xl: 18,
	r4xl: 24,
	rSheetA: 28,
	rPill: 999,
} as const;

// §5 Shadows. `boxShadow` first; `ios` and `elevation` are the legacy fallback for Android below API 28.
type ShadowToken = {
	boxShadow: string;
	ios: {
		shadowColor: string;
		shadowOffset: { width: number; height: number };
		shadowOpacity: number;
		shadowRadius: number;
	};
	elevation: number;
};

export const shadows: Record<ColorScheme, Record<"e1" | "e2" | "e3" | "ePage", ShadowToken>> = {
	light: {
		e1: {
			boxShadow: "0 1px 2px #17161112",
			ios: { shadowColor: "#171611", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 1 },
			elevation: 1,
		},
		e2: {
			boxShadow: "0 1px 2px #1716110F, 0 10px 28px -8px #1716112E",
			ios: { shadowColor: "#171611", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.14, shadowRadius: 12 },
			elevation: 4,
		},
		e3: {
			boxShadow: "0 2px 6px #17161114, 0 28px 64px -16px #1716114D",
			ios: { shadowColor: "#171611", shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.22, shadowRadius: 28 },
			elevation: 12,
		},
		ePage: {
			boxShadow: "0 1px 2px #17161114, 0 12px 36px -12px #17161140",
			ios: { shadowColor: "#171611", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.18, shadowRadius: 14 },
			elevation: 3,
		},
	},
	dark: {
		e1: {
			boxShadow: "0 1px 2px #00000066",
			ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.4, shadowRadius: 1 },
			elevation: 1,
		},
		e2: {
			boxShadow: "0 1px 2px #00000066, 0 12px 32px -8px #0000008C",
			ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.5, shadowRadius: 12 },
			elevation: 4,
		},
		e3: {
			boxShadow: "0 2px 6px #00000066, 0 28px 64px -12px #000000B3",
			ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.6, shadowRadius: 28 },
			elevation: 12,
		},
		ePage: {
			boxShadow: "0 1px 2px #00000066, 0 12px 36px -12px #00000099",
			ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.5, shadowRadius: 14 },
			elevation: 3,
		},
	},
};

// §6 Motion. With reduced motion on, d1–d3 become 0 for movement (see tokens.md §6).
export const motion = {
	d1: 120,
	d2: 200,
	d3: 320,
	ease: Easing.bezier(0.2, 0.8, 0.2, 1),
	easeMove: Easing.bezier(0.77, 0, 0.175, 1),
	easeDrawer: Easing.bezier(0.32, 0.72, 0, 1),
} as const;
