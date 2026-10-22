import { Redirect } from "expo-router";
import { routes } from "@/routes";

export default function CareerOffers() {
	return <Redirect href={routes.offers()} />;
}
