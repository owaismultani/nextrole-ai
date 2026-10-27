import { Redirect, useLocalSearchParams } from "expo-router";
import { routes } from "@/routes";

/** Keeps the offers chosen for "Plan what to ask" when the old address is opened. */
export default function CareerCoach() {
	const { offers } = useLocalSearchParams<{ offers?: string | string[] }>();
	return <Redirect href={{ pathname: routes.coach(), params: offers ? { offers } : {} }} />;
}
