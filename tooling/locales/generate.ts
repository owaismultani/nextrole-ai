import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { generatePresentLabels, generateSectionTitleCatalog } from "./section-titles";

const catalogs = fileURLToPath(new URL("../../apps/web/locales/", import.meta.url));

const titles = await generateSectionTitleCatalog(catalogs);
const titlesOutput = new URL("../../packages/pdf/src/section-title-catalog.json", import.meta.url);
await writeFile(titlesOutput, `${JSON.stringify(titles, null, "\t")}\n`);
console.log(`Updated PDF section titles for ${Object.keys(titles).length} locales.`);

const presentLabels = await generatePresentLabels(catalogs);
const presentOutput = new URL("../../packages/schema/src/resume/present-labels.json", import.meta.url);
await writeFile(presentOutput, `${JSON.stringify(presentLabels, null, "\t")}\n`);
console.log(`Updated "Present" for ${Object.keys(presentLabels).length} locales.`);
