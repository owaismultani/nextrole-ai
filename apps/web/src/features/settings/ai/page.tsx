import { ApiKeysSection } from "./api-keys";
import { ConnectedAppsSection } from "./connected-apps";
import { JobSourcesSection } from "./job-sources";
import { McpSection } from "./mcp";
import { ProvidersSection } from "./providers";
import { WebAccessSection } from "./web-access";

/** Integrations: the AI connections, web search and job sources that writing, coaching and discovery run on. */
export function IntegrationsSettings() {
	return (
		<>
			<ProvidersSection />
			<WebAccessSection />
			<JobSourcesSection />
		</>
	);
}

/** Developer: programmatic access: API keys, connected apps (OAuth) and the MCP endpoint. */
export function DeveloperSettings() {
	return (
		<>
			<ApiKeysSection />
			<ConnectedAppsSection />
			<McpSection />
		</>
	);
}
