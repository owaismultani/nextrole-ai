/**
 * The style contract templates are written against. Vendored from @react-pdf/stylesheet 6.3.2 (MIT, © Diego
 * Muracciole) when the engine moved to Forme, so templates keep their types; `forme/style.ts` maps it to Forme.
 */
type Percentage = `${string}%`;
type BorderStyleValue = "dashed" | "dotted" | "solid";
type BorderShorthandStyle = {
	border?: number | string;
	borderTop?: number | string;
	borderRight?: number | string;
	borderBottom?: number | string;
	borderLeft?: number | string;
	borderColor?: string;
	borderRadius?: number | string;
	borderStyle?: BorderStyleValue;
	borderWidth?: number | string;
};
type BorderExpandedStyle = {
	borderTopColor?: string;
	borderTopStyle?: BorderStyleValue;
	borderTopWidth?: number | string;
	borderRightColor?: string;
	borderRightStyle?: BorderStyleValue;
	borderRightWidth?: number | string;
	borderBottomColor?: string;
	borderBottomStyle?: BorderStyleValue;
	borderBottomWidth?: number | string;
	borderLeftColor?: string;
	borderLeftStyle?: BorderStyleValue;
	borderLeftWidth?: number | string;
	borderTopLeftRadius?: number | string;
	borderTopRightRadius?: number | string;
	borderBottomRightRadius?: number | string;
	borderBottomLeftRadius?: number | string;
};
type BorderStyle = BorderShorthandStyle & BorderExpandedStyle;
type FlexboxShorthandStyle = {
	flex?: number | string;
};
type AlignContent =
	| "flex-start"
	| "flex-end"
	| "center"
	| "stretch"
	| "space-between"
	| "space-around"
	| "space-evenly";
type AlignItems = "flex-start" | "flex-end" | "center" | "stretch" | "baseline";
type AlignSelf = "auto" | "flex-start" | "flex-end" | "center" | "baseline" | "stretch";
type FlexDirection = "row" | "row-reverse" | "column" | "column-reverse";
type FlexWrap = "nowrap" | "wrap" | "wrap-reverse";
type JustifyContent = "flex-start" | "flex-end" | "center" | "space-around" | "space-between" | "space-evenly";
type JustifySelf = string;
type FlexboxExpandedStyle = {
	alignContent?: AlignContent;
	alignItems?: AlignItems;
	alignSelf?: AlignSelf;
	flexDirection?: FlexDirection;
	flexWrap?: FlexWrap;
	flexFlow?: number | string;
	flexGrow?: number | string;
	flexShrink?: number | string;
	flexBasis?: number | string;
	justifySelf?: JustifySelf;
	justifyContent?: JustifyContent;
};
type FlexboxStyle = FlexboxShorthandStyle & FlexboxExpandedStyle;
type GapShorthandStyle = {
	gap?: number | string;
};
type GapExpandedStyle = {
	rowGap?: number | string;
	columnGap?: number | string;
};
type GapStyle = GapShorthandStyle & GapExpandedStyle;
type PositionShorthandStyle = {
	objectPosition?: number | string;
};
type PositionExpandedStyle = {
	objectPositionX?: number | string;
	objectPositionY?: number | string;
	objectFit?: string;
};
type PositioningStyle = PositionShorthandStyle & PositionExpandedStyle;
type ScaleTransform = {
	operation: "scale";
	value: [number, number];
};
type TranslateTransform = {
	operation: "translate";
	value: [number, number];
};
type RotateTransform = {
	operation: "rotate";
	value: [number, number, number];
};
type SkewTransform = {
	operation: "skew";
	value: [number, number];
};
type MatrixTransform = {
	operation: "matrix";
	value: [number, number, number, number, number, number];
};
type Transform = ScaleTransform | TranslateTransform | RotateTransform | SkewTransform | MatrixTransform;
type TransformShorthandStyle = {
	transformOrigin?: number | string;
};
type TransformExpandedStyle = {
	transformOriginX?: number | string;
	transformOriginY?: number | string;
	transform?: string | Transform[];
	gradientTransform?: string | Transform[];
};
type TransformStyle = TransformShorthandStyle & TransformExpandedStyle;
type Display = "flex" | "none";
type Position = "absolute" | "relative" | "static";
type Float = "left" | "right" | "none";
type Clear = Float | "both";
type ShapeScalar = number | Percentage;
type ShapeRadius = ShapeScalar | "closest-side" | "farthest-side";
type ShapeOutside =
	| {
			type: "circle";
			cx: ShapeScalar;
			cy: ShapeScalar;
			r: ShapeRadius;
	  }
	| {
			type: "ellipse";
			cx: ShapeScalar;
			cy: ShapeScalar;
			rx: ShapeRadius;
			ry: ShapeRadius;
	  }
	| {
			type: "polygon";
			points: {
				x: ShapeScalar;
				y: ShapeScalar;
			}[];
	  }
	| {
			type: "inset";
			top: ShapeScalar;
			right: ShapeScalar;
			bottom: ShapeScalar;
			left: ShapeScalar;
	  };
type LayoutStyle = {
	aspectRatio?: number | string;
	bottom?: number | string;
	clear?: Clear;
	display?: Display;
	float?: Float;
	left?: number | string;
	position?: Position;
	right?: number | string;
	shapeOutside?: string | ShapeOutside;
	top?: number | string;
	overflow?: "hidden";
	zIndex?: number | string;
};
type DimensionStyle = {
	height?: number | string;
	maxHeight?: number | string;
	maxWidth?: number | string;
	minHeight?: number | string;
	minWidth?: number | string;
	width?: number | string;
};
type ColorStyle = {
	backgroundColor?: string;
	color?: string;
	opacity?: number | string;
};
type FontStyle = "normal" | "italic" | "oblique";
type FontWeight =
	| string
	| number
	| "thin"
	| "hairline"
	| "ultralight"
	| "extralight"
	| "light"
	| "normal"
	| "medium"
	| "semibold"
	| "demibold"
	| "bold"
	| "ultrabold"
	| "extrabold"
	| "heavy"
	| "black";
type TextAlign = "left" | "right" | "center" | "justify";
type TextDecoration = "line-through" | "underline" | "none" | "line-through underline" | "underline line-through";
type TextDecorationStyle = "dashed" | "dotted" | "solid" | string;
type TextTransform = "capitalize" | "lowercase" | "uppercase" | "upperfirst" | "none";
type VerticalAlign = "sub" | "super";
type FontFeatureSetting =
	| "liga"
	| "dlig"
	| "onum"
	| "lnum"
	| "tnum"
	| "zero"
	| "frac"
	| "sups"
	| "subs"
	| "smcp"
	| "c2sc"
	| "case"
	| "hlig"
	| "calt"
	| "swsh"
	| "hist"
	| `ss${"01" | "02" | "03" | "04" | "05" | "06" | "07" | "08" | "09" | "10" | "11" | "12" | "13" | "14" | "15" | "16" | "17" | "18" | "19" | "20"}`
	| "kern"
	| "locl"
	| "rlig"
	| "medi"
	| "init"
	| "isol"
	| "fina"
	| "mark"
	| "mkmk"
	| (string & {});
type FontFeatureSettings = FontFeatureSetting[] | Partial<Record<FontFeatureSetting, number | boolean>>;
type TextStyle = {
	direction?: "ltr" | "rtl";
	fontSize?: number | string;
	fontFamily?: string | string[];
	fontStyle?: FontStyle;
	fontWeight?: FontWeight;
	fontFeatureSettings?: FontFeatureSettings;
	letterSpacing?: number | string;
	lineHeight?: number | string;
	maxLines?: number | string;
	textAlign?: TextAlign;
	textDecoration?: TextDecoration;
	textDecorationColor?: string;
	textDecorationStyle?: TextDecorationStyle;
	textIndent?: number | string;
	textOverflow?: "ellipsis";
	textTransform?: TextTransform;
	verticalAlign?: VerticalAlign;
};
type MarginShorthandStyle = {
	margin?: number | string;
	marginHorizontal?: number | string;
	marginVertical?: number | string;
};
type MarginExpandedStyle = {
	marginTop?: number | string;
	marginRight?: number | string;
	marginBottom?: number | string;
	marginLeft?: number | string;
};
type MarginStyle = MarginShorthandStyle & MarginExpandedStyle;
type PaddingShorthandStyle = {
	padding?: number | string;
	paddingHorizontal?: number | string;
	paddingVertical?: number | string;
};
type PaddingExpandedStyle = {
	paddingTop?: number | string;
	paddingRight?: number | string;
	paddingBottom?: number | string;
	paddingLeft?: number | string;
};
type PaddingStyle = PaddingShorthandStyle & PaddingExpandedStyle;
interface SvgStyle {
	fill?: string;
	stroke?: string;
	strokeDasharray?: string;
	strokeWidth?: string | number;
	fillOpacity?: string | number;
	fillRule?: "nonzero" | "evenodd";
	strokeOpacity?: string | number;
	textAnchor?: "start" | "middle" | "end";
	strokeLinecap?: "butt" | "round" | "square";
	strokeLinejoin?: "butt" | "round" | "square" | "miter" | "bevel";
	visibility?: "visible" | "hidden" | "collapse";
	clipPath?: string;
	dominantBaseline?:
		| "auto"
		| "middle"
		| "central"
		| "hanging"
		| "mathematical"
		| "text-after-edge"
		| "text-before-edge";
}
type BaseStyle = BorderStyle &
	ColorStyle &
	DimensionStyle &
	FlexboxStyle &
	GapStyle &
	LayoutStyle &
	MarginStyle &
	PaddingStyle &
	PositioningStyle &
	TextStyle &
	TransformStyle &
	SvgStyle;
type MediaQueryStyle = {
	[key in `@media${string}`]: BaseStyle;
};
export type Style = BaseStyle & MediaQueryStyle;
type RecursiveArray<T> = Array<T | ReadonlyArray<T> | RecursiveArray<T>>;
export type StyleProp = Style | Style[] | RecursiveArray<Style | Style[] | undefined>;
