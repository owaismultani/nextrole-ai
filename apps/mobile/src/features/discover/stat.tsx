import { View } from "react-native";
import { Card, Text } from "@/ui";

/** One labelled figure: a large number or short value over what it counts. */
export function StatTile({ value, label, bad }: { value: string | number; label: string; bad?: boolean }) {
	return (
		<Card style={{ flexGrow: 1, flexBasis: "45%" }}>
			<View style={{ gap: 2 }}>
				<Text variant="heading" color={bad ? "dangerText" : "ink"}>
					{String(value)}
				</Text>
				<Text variant="callout" color="ink2">
					{label}
				</Text>
			</View>
		</Card>
	);
}
