import type { ModelMessage } from "ai";
import { describe, expect, it } from "vitest";
import { estimateTokens, pruneAgentModelContext } from "./context";

const BIG_RESUME = { basics: { name: "Alice" }, sections: { summary: { content: "x".repeat(2_000) } } };

function readResumeExchange(callId: string, toolName = "read_resume"): ModelMessage[] {
	return [
		{
			role: "assistant",
			content: [{ type: "tool-call", toolCallId: callId, toolName, input: {} }],
		},
		{
			role: "tool",
			content: [
				{
					type: "tool-result",
					toolCallId: callId,
					toolName,
					output: { type: "json", value: { id: "resume-1", data: BIG_RESUME } },
				},
			],
		},
	] as ModelMessage[];
}

function patchExchange(callId: string): ModelMessage[] {
	return [
		{
			role: "assistant",
			content: [{ type: "tool-call", toolCallId: callId, toolName: "apply_resume_patch", input: { title: "Edit" } }],
		},
		{
			role: "tool",
			content: [
				{
					type: "tool-result",
					toolCallId: callId,
					toolName: "apply_resume_patch",
					output: { type: "json", value: { actionId: `action-${callId}`, resume: BIG_RESUME } },
				},
			],
		},
	] as ModelMessage[];
}

function user(text: string): ModelMessage {
	return { role: "user", content: [{ type: "text", text }] };
}

function messageParts(message: ModelMessage | undefined) {
	return (message?.content ?? []) as Array<Record<string, unknown>>;
}

function snapshotValue(message: ModelMessage | undefined) {
	const part = messageParts(message)[0];
	return ((part?.output ?? {}) as { value?: Record<string, unknown> }).value ?? {};
}

describe("pruneAgentModelContext — tier 0 (snapshot supersession)", () => {
	it("keeps only the last cover letter snapshot too", () => {
		const messages = [
			user("hi"),
			...readResumeExchange("call-1", "read_letter"),
			...readResumeExchange("call-2", "read_letter"),
		];

		const pruned = pruneAgentModelContext(messages, 1_000_000);

		expect(snapshotValue(pruned[2])).not.toHaveProperty("data");
		expect(snapshotValue(pruned[4])).toHaveProperty("data");
	});
});

describe("pruneAgentModelContext — tier 3 (turn dropping)", () => {
	function textTurn(userText: string, assistantText: string): ModelMessage[] {
		return [
			{ role: "user", content: [{ type: "text", text: userText }] },
			{ role: "assistant", content: [{ type: "text", text: assistantText }] },
		];
	}

	it("drops tool call/result pairs atomically with their turn", () => {
		const messages = [
			...textTurn("intro ".repeat(60), "ok"),
			{ role: "user", content: [{ type: "text", text: "edit please ".repeat(60) }] } as ModelMessage,
			...patchExchange("call-old"),
			...textTurn("follow up ".repeat(30), "done"),
			...textTurn("latest question", "latest answer"),
		];

		const pruned = pruneAgentModelContext(messages, 40);

		// The dropped turn takes both the tool call and its result with it — no orphaned side.
		const text = JSON.stringify(pruned);
		expect(text).not.toContain("call-old");
		expect(text).not.toContain('"tool-result"');
		expect(text).toContain("latest question");
	});

	it("never drops the final two turns even when still over budget", () => {
		const messages = [
			...textTurn("first question ".repeat(100), "first answer ".repeat(100)),
			...textTurn("second question ".repeat(100), "second answer ".repeat(100)),
			...textTurn("third question ".repeat(100), "third answer ".repeat(100)),
		];

		const pruned = pruneAgentModelContext(messages, 10);

		// Only the oldest turn is droppable; the penultimate and final turns must both survive
		// even though the result is still over budget.
		expect(pruned).toHaveLength(4);
		expect(JSON.stringify(pruned)).not.toContain("first question");
		expect(JSON.stringify(pruned)).toContain("second question");
		expect(JSON.stringify(pruned)).toContain("third question");
	});
});

describe("estimateTokens", () => {
	it("treats binary attachment data as opaque bytes instead of serializing it", () => {
		const bytes = new Uint8Array(1024 * 1024);
		const message = { role: "user", content: [{ type: "image", image: bytes, mediaType: "image/png" }] };

		const estimate = estimateTokens(message);

		// ~bytes/4 tokens, computed without expanding each byte into JSON.
		expect(estimate).toBeGreaterThan(200_000);
		expect(estimate).toBeLessThan(300_000);
	});
});
