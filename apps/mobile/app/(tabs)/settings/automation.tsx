import { Redirect } from "expo-router";
import { routes } from "@/routes";

// Automation moved out of Settings into its own tab; the old address redirects.
export default function SettingsAutomation() {
	return <Redirect href={routes.automation()} />;
}
