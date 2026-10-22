import { Redirect } from "expo-router";
import { routes } from "@/routes";

export default function CareerKnowledge() {
	return <Redirect href={routes.profile("facts")} />;
}
