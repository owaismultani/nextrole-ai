import { useLingui } from "@lingui/react/macro";
import { Stack, usePathname, useRouter } from "expo-router";
import { View } from "react-native";
import { SafeAreaInsetsContext, SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { CollectionHeader } from "@/components/collection-header";
import { routes } from "@/routes";
import { useTabStackOptions } from "@/shell/app-banner";
import { Segmented, useTheme } from "@/ui";

export default function CareerLayout() {
	const { t } = useLingui();
	const { colors, motion, space } = useTheme();
	const insets = useSafeAreaInsets();
	const stackOptions = useTabStackOptions(true);
	const pathname = usePathname();
	const router = useRouter();
	const tabs = [
		{ value: "today", label: t`Today` },
		{ value: "coach", label: t`Coach` },
		{ value: "knowledge", label: t`Knowledge` },
		{ value: "offers", label: t`Offers` },
	] as const;
	return (
		<SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1, backgroundColor: colors.bg }}>
			<View style={{ paddingHorizontal: space.s4, paddingTop: space.s4, paddingBottom: space.s1, gap: space.s3 }}>
				<CollectionHeader title={t`Career`} />
				<Segmented
					label={t`Career`}
					value={tabs.find((tab) => pathname.endsWith(`/${tab.value}`))?.value ?? "today"}
					options={[...tabs]}
					onChange={(tab) => router.replace(routes.career(tab))}
				/>
			</View>
			{/* Plain content needs an opaque header; SafeAreaView already clears the status bar. */}
			<SafeAreaInsetsContext value={{ ...insets, top: 0, left: 0, right: 0 }}>
				{/* The sub-tabs are peers swapped with `replace`, so they crossfade instead of pushing. */}
				<Stack
					screenOptions={{ ...stackOptions, animation: "fade", animationDuration: motion.d2, headerTransparent: false }}
				>
					{["index", ...tabs.map((tab) => tab.value)].map((name) => (
						<Stack.Screen key={name} name={name} options={{ headerShown: false }} />
					))}
				</Stack>
			</SafeAreaInsetsContext>
		</SafeAreaView>
	);
}
