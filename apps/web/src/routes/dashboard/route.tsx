import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppShell } from "./-components/app-shell";
import { orpc } from "@/libs/orpc/client";
import { createNoindexFollowMeta } from "@/libs/seo";

export const Route = createFileRoute("/dashboard")({
	component: RouteComponent,
	beforeLoad: async ({ context, location }) => {
		if (!context.session) throw redirect({ to: "/auth/login", search: { callbackURL: location.href }, replace: true });
		// A person who has set nothing up yet is guided through setup once; it can be skipped, and never blocks the app.
		if (!location.pathname.startsWith("/dashboard/start")) {
			const setup = await context.queryClient
				.fetchQuery({ ...orpc.career.setup.queryOptions({ input: {} }), staleTime: 60_000 })
				.catch(() => null);
			if (setup?.needsSetup) throw redirect({ to: "/dashboard/start", replace: true });
		}
		return { session: context.session };
	},
	head: () => ({
		meta: [createNoindexFollowMeta()],
	}),
});

function RouteComponent() {
	return (
		<AppShell>
			<Outlet />
		</AppShell>
	);
}
