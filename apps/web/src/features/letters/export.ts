import type { ExportFormat } from "@/features/resume/export/use-resume-export";
import type { CoverLetter } from "@reactive-resume/schema/cover-letter/data";
import { createCoverLetterResumeData } from "@reactive-resume/resume/cover-letter";
import { createLetterWordsForLocale, letterPageData } from "./compose";
import { createExportFile, getDefaultFileName } from "@/features/resume/export/use-resume-export";
import { client } from "@/libs/orpc/client";

/** "First-Last-Cover-Letter", from the sender's name. */
export const letterFileName = (letter: CoverLetter) =>
	getDefaultFileName({ name: letter.name, slug: "", data: createCoverLetterResumeData(letter) }, "cover-letter");

/** The letter as a file: the page with its sender header, or JSON that imports back as a letter. */
export async function createLetterFile(letter: CoverLetter, format: ExportFormat): Promise<Blob> {
	if (format === "json") {
		const document = await client.coverLetters.export({ id: letter.id });
		return new Blob([JSON.stringify(document, null, 2)], { type: "application/json" });
	}
	const words = await createLetterWordsForLocale(letter.style.metadata.page.locale);
	return createExportFile(
		{ name: letter.name, slug: "", data: letterPageData(letter, words) },
		format,
		"cover-letter",
		{
			includeCoverLetterHeader: true,
		},
	);
}
