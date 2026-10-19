// Run after iOS pod install: node apps/mobile/scripts/hermes-compat.test.mjs
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const mobile = new URL("../", import.meta.url);
process.chdir(fileURLToPath(mobile));
const require = createRequire(new URL("package.json", mobile));
const { transformSync } = createRequire(require.resolve("babel-preset-expo"))("@babel/core");
const source = require.resolve("@orpc/client");
const result = transformSync(readFileSync(source, "utf8"), {
	filename: source,
	configFile: fileURLToPath(new URL("babel.config.js", mobile)),
	caller: { name: "metro", platform: "ios", engine: "hermes", isDev: false, supportsStaticESM: false },
});
assert(result?.code);
const dir = mkdtempSync(join(tmpdir(), "rr-hermes-"));
try {
	const input = join(dir, "client.js");
	writeFileSync(input, result.code);
	const compiled = spawnSync(
		fileURLToPath(new URL("ios/Pods/hermes-engine/destroot/bin/hermesc", mobile)),
		["-emit-binary", "-out", join(dir, "client.hbc"), input],
		{ encoding: "utf8" },
	);
	assert.equal(compiled.status, 0, compiled.stderr || compiled.error?.message);
	console.log("PASS: release-transformed oRPC client compiles with app's Hermes compiler.");
} finally {
	rmSync(dir, { recursive: true, force: true });
}
