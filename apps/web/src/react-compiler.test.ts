import { describe, expect, it } from "vitest";
import { transformAsync } from "@babel/core";
import { reactCompilerPreset } from "@vitejs/plugin-react";

// vite.config.ts runs the React Compiler through @rolldown/plugin-babel, which uses this package's @babel/core.
// Under Babel 8, babel-plugin-react-compiler 1.0 silently skips every function with a destructuring default.
describe("React Compiler build setup", () => {
	it("compiles a component that destructures props with a default", async () => {
		const result = await transformAsync("export function Badge({ tone = 'ink' }) { return <span>{tone}</span>; }", {
			filename: "badge.jsx",
			babelrc: false,
			configFile: false,
			presets: [reactCompilerPreset().preset],
			parserOpts: { plugins: ["jsx"] },
		});

		expect(result?.code).toContain("react/compiler-runtime");
	});
});
