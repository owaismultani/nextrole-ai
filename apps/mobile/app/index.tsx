import { useQuery } from "@tanstack/react-query";
import { Redirect } from "expo-router";
import { orpc } from "@/api/client";
import { useSession } from "@/auth/session";
import { routes } from "@/routes";

/** The launch route: straight to sign-in when signed out, so Documents never renders first. */
export default function Index() {
	const session = useSession();
	const signedIn = session.status === "signed-in";
	// A person who has set nothing up is guided through setup once. It can be skipped, and a failed check never blocks.
	const setup = useQuery({
		...orpc.career.setup.queryOptions({ input: {} }),
		enabled: signedIn,
		retry: false,
		queryKey: [...orpc.career.setup.key(), session.server],
	});
	if (signedIn && setup.isPending) return null;
	if (signedIn && setup.data?.needsSetup) return <Redirect href={routes.setup()} />;
	// Expired stays on Documents under the "Sign in again" sheet (SessionGate).
	if (signedIn || session.status === "expired") return <Redirect href={routes.documents()} />;
	return <Redirect href={routes.signIn()} />;
}
