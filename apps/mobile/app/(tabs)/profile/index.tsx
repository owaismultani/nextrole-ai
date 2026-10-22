import { Redirect } from "expo-router";
import { routes } from "@/routes";

export default function ProfileIndex() {
	return <Redirect href={routes.profile()} />;
}
