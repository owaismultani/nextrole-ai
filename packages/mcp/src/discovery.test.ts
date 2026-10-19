import type { RouterClient } from "@orpc/server";
import type { RequestAuthentication } from "@reactive-resume/api/context";
import { expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { toJsonSchemaCompat } from "@modelcontextprotocol/sdk/server/zod-json-schema-compat.js";
import z from "zod";
import { discoveryJsonSchema } from "./contracts";
import { registerToolDiscovery } from "./discovery";
import { buildMcpServerCard } from "./mcp-server-card";
import { MCP_ROUTER, parityToolContract, registerParityTools } from "./parity";
import { registerTools } from "./tools";

it("matches the complete unmodified SDK tools/list response and server-card schemas", async () => {
	const server = new McpServer({ name: "discovery-test", version: "1.0.0" });
	const apiClient = {} as RouterClient<typeof MCP_ROUTER>;
	const authentication: RequestAuthentication = {
		user: {
			id: "owner",
			name: "Owner",
			email: "owner@example.test",
			emailVerified: true,
			createdAt: new Date(0),
			updatedAt: new Date(0),
		},
		method: "bearer",
		permissions: ["read", "write", "delete"],
	};
	registerTools(server, apiClient, new Headers(), authentication);
	registerParityTools(server, apiClient, new Headers(), {
		authentication,
		resHeaders: new Headers(),
		locale: "en-US",
		trustedClient: "127.0.0.1",
	});
	const client = new Client({ name: "discovery-client", version: "1.0.0" });
	const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
	try {
		await server.connect(serverTransport);
		await client.connect(clientTransport);
		const baseline = JSON.parse(JSON.stringify(await client.listTools()));
		registerToolDiscovery(server);
		const optimized = JSON.parse(JSON.stringify(await client.listTools()));
		expect(optimized).toEqual(baseline);
		expect(buildMcpServerCard("1.0.0").tools).toEqual(
			(await client.listTools()).tools.map(({ execution: _execution, _meta, ...tool }) => tool),
		);
	} finally {
		await client.close();
		await server.close();
	}
}, 30_000);

it("keys JSON Schema reuse by schema identity and all SDK conversion options", () => {
	const schema = z.object({ value: z.string().default("default") });
	const options = [
		{ strictUnions: true, pipeStrategy: "input" as const },
		{ strictUnions: true, pipeStrategy: "output" as const },
		{ strictUnions: false, pipeStrategy: "input" as const },
		{ strictUnions: true, pipeStrategy: "input" as const, target: "draft-2020-12" as const },
	] as const;
	const converted = options.map((option) => discoveryJsonSchema(schema, option));
	for (const [index, option] of options.entries()) {
		expect(converted[index]).toEqual(toJsonSchemaCompat(schema, option));
		expect(discoveryJsonSchema(schema, { ...option })).toBe(converted[index]);
	}
	expect(converted[0]?.required).toBeUndefined();
	expect(converted[1]?.required).toEqual(["value"]);
	expect(new Set(converted).size).toBe(options.length);
	const other = z.object({ value: z.number() });
	expect(discoveryJsonSchema(other, options[0])).toEqual(toJsonSchemaCompat(other, options[0]));
});

it("keeps procedure aliases and different procedures' contracts distinct", () => {
	const procedure = MCP_ROUTER.rest.documentExports.resume;
	const ordinary = parityToolContract("ordinary", procedure);
	const special = parityToolContract("rest.documentExports.resume", procedure);
	expect(ordinary.outputSchema.shape).not.toHaveProperty("requiresAuthentication");
	expect(special.outputSchema.shape).toHaveProperty("requiresAuthentication");
	expect(parityToolContract("rest.documentExports.resume", procedure)).toBe(special);
	const different = parityToolContract("ordinary", MCP_ROUTER.resume.checkSlug);
	expect(different.inputSchema.shape).not.toHaveProperty("format");
	expect(ordinary.inputSchema.shape).toHaveProperty("format");
});
