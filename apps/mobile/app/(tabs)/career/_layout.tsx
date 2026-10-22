import { Stack } from "expo-router";

/** Career was split into Overview, Discover, Profile, Coach and Applications → Offers; its old addresses redirect. */
export default function CareerLayout() {
	return <Stack screenOptions={{ headerShown: false }} />;
}
