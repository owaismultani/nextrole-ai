import { readdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";

/**
 * Writes `packages/pdf/src/forme/phosphor-icons.json`: every regular-weight Phosphor icon as the SVG markup inside
 * its 256×256 viewBox, keyed by its kebab-case name ("address-book"). The PDF engine draws icons from these strings.
 */

const require = createRequire(import.meta.url);
const defsDirectory = join(dirname(require.resolve("@phosphor-icons/react")), "defs");
const target = fileURLToPath(new URL("../../packages/pdf/src/forme/phosphor-icons.json", import.meta.url));

// "AddressBookTabs" → "address-book-tabs", "XLogo" → "x-logo", "NumberCircleOne" → "number-circle-one".
export const kebab = (name: string) =>
	name
		.replace(/([a-z0-9])([A-Z])/g, "$1-$2")
		.replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
		.toLowerCase();

// Forme 0.25 misreads path numbers written back to back ("-21.11-.13-.06"), drawing some icons as blobs, so every
// number and command gets its own space-separated token.
const spacePathData = (markup: string) =>
	markup.replace(/ d="([^"]*)"/g, (_, data: string) => {
		const tokens = data.match(/[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g) ?? [];
		return ` d="${tokens.join(" ")}"`;
	});

const files = (await readdir(defsDirectory)).filter((file) => file.endsWith(".es.js")).sort();
const icons: Record<string, string> = {};
for (const file of files) {
	const module = (await import(join(defsDirectory, file))) as { default: Map<string, unknown> };
	const regular = module.default.get("regular");
	if (!regular) continue;
	icons[kebab(file.replace(/\.es\.js$/, ""))] = spacePathData(
		renderToStaticMarkup(regular as Parameters<typeof renderToStaticMarkup>[0]),
	);
}

await writeFile(target, `${JSON.stringify(icons)}\n`);
console.log(`Wrote ${Object.keys(icons).length} icons to ${target}`);
