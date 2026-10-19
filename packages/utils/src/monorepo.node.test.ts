import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { findWorkspaceRoot, getLocalDataDirectory } from "./monorepo.node";

describe("findWorkspaceRoot", () => {
	let tempDir: string;

	beforeEach(() => {
		// Resolve symlinks so comparisons match findWorkspaceRoot's realpathSync output.
		tempDir = realpathSync(mkdtempSync(join(tmpdir(), "rr-monorepo-test-")));
	});

	afterEach(() => {
		rmSync(tempDir, { recursive: true, force: true });
	});

	it("walks up directories to find pnpm-workspace.yaml", () => {
		const nested = join(tempDir, "apps", "web");
		mkdirSync(nested, { recursive: true });
		writeFileSync(join(tempDir, "pnpm-workspace.yaml"), "packages: ['*']");

		expect(findWorkspaceRoot(nested)).toBe(tempDir);
	});
});

describe("getLocalDataDirectory", () => {
	let tempDir: string;

	beforeEach(() => {
		tempDir = realpathSync(mkdtempSync(join(tmpdir(), "rr-data-test-")));
	});

	afterEach(() => {
		rmSync(tempDir, { recursive: true, force: true });
	});

	it("returns workspaceRoot/data when manifest is found", () => {
		writeFileSync(join(tempDir, "pnpm-workspace.yaml"), "packages: ['*']");

		expect(getLocalDataDirectory(undefined, tempDir)).toBe(join(tempDir, "data"));
	});
});
