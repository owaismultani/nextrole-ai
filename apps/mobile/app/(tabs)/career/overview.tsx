import { Redirect } from "expo-router";
import { routes } from "@/routes";

export default function CareerOverview() {
	return <Redirect href={routes.overview()} />;
}
