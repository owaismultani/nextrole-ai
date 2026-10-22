import { useLingui } from "@lingui/react/macro";
import { useNetworkState } from "expo-network";
import { useRouter } from "expo-router";
import { Tabs } from "expo-router/tabs";
import { View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import {
	SafeAreaInsetsContext,
	SafeAreaProvider,
	SafeAreaView,
	useSafeAreaInsets,
} from "react-native-safe-area-context";
import { routes } from "@/routes";
import { AppStrip, BannerAbove } from "@/shell/app-banner";
import { AppSidebar, PhoneTabBar } from "@/shell/app-tabs";
import { useKeyCommands } from "@/shell/key-commands";
import { useIsTablet } from "@/shell/use-is-tablet";
import { useReducedMotion, useTheme } from "@/ui";

/**
 * Overview, Discover, the raised "+" (opens New as a modal), Applications, Documents and More on the phone bar; Profile,
 * Coach, Automation, Settings and Reminders are hidden tabs reached from More. Tablet: the 240 pt sidebar lists them all. The offline strip (from the network state) sits under the status bar above every
 * tab. Screens end at the top of the keyboard.
 */
export default function TabsLayout() {
	const router = useRouter();
	const { t } = useLingui();
	const tablet = useIsTablet();
	const insets = useSafeAreaInsets();
	const network = useNetworkState();
	const offline = network.isConnected === false || network.isInternetReachable === false;
	const { colors, motion } = useTheme();
	const reduced = useReducedMotion();
	useKeyCommands(
		[
			{ id: "search", input: "k", title: t`Search`, run: () => router.push(routes.search()) },
			{ id: "new", input: "n", title: t`New`, run: () => router.push(routes.new()) },
		],
		"global",
	);

	return (
		<View style={{ flex: 1, backgroundColor: colors.bg }}>
			{offline ? (
				<View style={{ paddingTop: insets.top, paddingStart: insets.left, paddingEnd: insets.right }}>
					<AppStrip
						tone="info"
						icon="cloud-slash"
						message={t`Offline. Edits are saved on this device and sync when you reconnect.`}
					/>
				</View>
			) : null}
			{/* Under a banner the status bar is already cleared, so the tabs' headers must not pad it again. */}
			<SafeAreaInsetsContext value={offline ? { ...insets, top: 0 } : insets}>
				<BannerAbove value={offline}>
					<KeyboardAvoidingView behavior="padding" automaticOffset style={{ flex: 1 }}>
						<SafeAreaView edges={["left", "right"]} style={{ flex: 1 }}>
							<SafeAreaProvider>
								<Tabs
									tabBar={(props) => (tablet ? <AppSidebar {...props} /> : <PhoneTabBar {...props} />)}
									screenOptions={{
										// Owner asked for a swipe between tabs; reduced motion keeps a short crossfade.
										animation: reduced ? "fade" : "shift",
										transitionSpec: {
											animation: "timing",
											config: { duration: reduced ? motion.d1 : 220, easing: motion.ease },
										},
										headerShown: false,
										tabBarPosition: tablet ? "left" : "bottom",
									}}
								>
									<Tabs.Screen name="overview" options={{ title: t`Overview` }} />
									<Tabs.Screen name="discover" options={{ title: t`Discover` }} />
									<Tabs.Screen
										name="create"
										options={{ title: t`New` }}
										listeners={{
											tabPress: (event) => {
												event.preventDefault();
												router.push(routes.new());
											},
										}}
									/>
									<Tabs.Screen name="applications" options={{ title: t`Applications` }} />
									<Tabs.Screen name="documents" options={{ title: t`Documents` }} />
									<Tabs.Screen name="more" options={{ title: t`More` }} />
									{/* Reached from More (phone) or the sidebar (tablet), not from a bar cell. */}
									<Tabs.Screen name="profile" options={{ title: t`Profile`, href: null }} />
									<Tabs.Screen name="coach" options={{ title: t`Coach`, href: null }} />
									<Tabs.Screen name="automation" options={{ title: t`Automation`, href: null }} />
									<Tabs.Screen name="settings" options={{ title: t`Settings`, href: null }} />
									<Tabs.Screen name="reminders" options={{ title: t`Reminders`, href: null }} />
									<Tabs.Screen name="career" options={{ title: t`Career`, href: null }} />
								</Tabs>
							</SafeAreaProvider>
						</SafeAreaView>
					</KeyboardAvoidingView>
				</BannerAbove>
			</SafeAreaInsetsContext>
		</View>
	);
}
