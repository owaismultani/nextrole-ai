import { Redirect } from "expo-router";
import { routes } from "@/routes";

export default function CareerPipeline() {
	return <Redirect href={routes.discover("activity")} />;
}
