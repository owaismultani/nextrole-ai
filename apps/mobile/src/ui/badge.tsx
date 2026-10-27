import type { ColorToken } from "./tokens";
import { View } from "react-native";
import { Text } from "./text";
import { useTheme } from "./theme";

export type BadgeTone = "neutral" | "ok" | "warn" | "danger" | "info" | "accent";

const palette = {
	neutral: { background: "sunken", text: "ink2" },
	ok: { background: "okSoft", text: "okText" },
	warn: { background: "warnSoft", text: "warnText" },
	danger: { background: "dangerSoft", text: "dangerText" },
	info: { background: "infoSoft", text: "infoText" },
	accent: { background: "accentSoft", text: "accentText" },
} as const satisfies Record<BadgeTone, { background: ColorToken; text: ColorToken }>;

export type BadgeProps = { label: string; tone?: BadgeTone | undefined };

/** A status pill. Colour always pairs with its text; a badge is never the only signal and is not an action. */
export function Badge({ label, tone = "neutral" }: BadgeProps) {
	const { colors, radius, space } = useTheme();
	const { background, text } = palette[tone];
	return (
		<View
			style={{
				alignSelf: "flex-start",
				paddingHorizontal: space.s2,
				paddingVertical: space.s0,
				borderRadius: radius.rSm,
				backgroundColor: colors[background],
			}}
		>
			<Text variant="micro" color={text}>
				{label}
			</Text>
		</View>
	);
}
