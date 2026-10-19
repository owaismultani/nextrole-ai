import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

export const Route = createFileRoute("/builder/$resumeId/")({
	component: lazyRouteComponent(() => import("./-components/page-canvas"), "PageCanvas"),
});
