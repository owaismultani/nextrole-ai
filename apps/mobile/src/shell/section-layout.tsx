import type { Href } from "expo-router";
import type { ReactNode } from "react";
import { Stack, usePathname, useRouter } from "expo-router";
import { View } from "react-native";
import { SafeAreaInsetsContext, SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { CollectionHeader } from "@/components/collection-header";
import { useTabStackOptions } from "@/shell/app-banner";
import { Segmented, useTheme } from "@/ui";

type SectionLayoutProps<Name extends string> = {
	title: string;
	/** The accessible name of the section switcher. */
	label: string;
	/** `file`: the screen's file name under the tab when it is not the section name (Jobs is the index). */
	sections: readonly { value: Name; label: string; file?: string }[];
	hrefFor: (section: Name) => Href;
	/** The section a path without a section name opens. */
	fallback: Name;
	/** Under the title, above the switcher: a status line or summary. */
	children?: ReactNode;
};

/**
 * A tab with a few peer sections (Discover: Jobs and Search activity; Profile: its five sections): a title, a segmented
 * switcher and the sections as screens that crossfade. The sections are swapped with `replace`, so they do not stack.
 */
export function SectionLayout<Name extends string>({
	title,
	label,
	sections,
	hrefFor,
	fallback,
	children,
}: SectionLayoutProps<Name>) {
	const { colors, motion, space } = useTheme();
	const insets = useSafeAreaInsets();
	const stackOptions = useTabStackOptions(true);
	const pathname = usePathname();
	const router = useRouter();
	const current = sections.find((section) => pathname.endsWith(`/${section.value}`))?.value ?? fallback;

	return (
		<SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1, backgroundColor: colors.bg }}>
			<View style={{ paddingHorizontal: space.s4, paddingTop: space.s4, paddingBottom: space.s1, gap: space.s3 }}>
				<CollectionHeader title={title} />
				{children}
				<Segmented
					label={label}
					value={current}
					options={sections.map(({ value, label }) => ({ value, label }))}
					onChange={(section) => router.replace(hrefFor(section as Name))}
				/>
			</View>
			{/* Plain content needs an opaque header; SafeAreaView already clears the status bar. */}
			<SafeAreaInsetsContext value={{ ...insets, top: 0, left: 0, right: 0 }}>
				<Stack
					screenOptions={{ ...stackOptions, animation: "fade", animationDuration: motion.d2, headerTransparent: false }}
				>
					{sections.map((section) => (
						<Stack.Screen key={section.value} name={section.file ?? section.value} options={{ headerShown: false }} />
					))}
				</Stack>
			</SafeAreaInsetsContext>
		</SafeAreaView>
	);
}

/** A tab with a single screen under a plain title (Overview, Coach, Automation, Reminders): no switcher, no large title. */
export function PlainLayout({ title, children }: { title: string; children?: ReactNode }) {
	const { colors, motion, space } = useTheme();
	const insets = useSafeAreaInsets();
	const stackOptions = useTabStackOptions(true);
	return (
		<SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1, backgroundColor: colors.bg }}>
			<View style={{ paddingHorizontal: space.s4, paddingTop: space.s4, paddingBottom: space.s1, gap: space.s3 }}>
				<CollectionHeader title={title} />
				{children}
			</View>
			<SafeAreaInsetsContext value={{ ...insets, top: 0, left: 0, right: 0 }}>
				<Stack
					screenOptions={{ ...stackOptions, animation: "fade", animationDuration: motion.d2, headerTransparent: false }}
				>
					<Stack.Screen name="index" options={{ headerShown: false }} />
				</Stack>
			</SafeAreaInsetsContext>
		</SafeAreaView>
	);
}
