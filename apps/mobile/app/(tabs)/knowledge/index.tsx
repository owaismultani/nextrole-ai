import { Redirect } from "expo-router";
import { routes } from "@/routes";

export default function KnowledgeIndex() {
	return <Redirect href={routes.knowledge()} />;
}
