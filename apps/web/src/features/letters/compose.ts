import type { LetterWords } from "@reactive-resume/resume/cover-letter";
import type { CoverLetter } from "@reactive-resume/schema/cover-letter/data";
import { setupI18n } from "@lingui/core";
import { t } from "@lingui/core/macro";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { composeCoverLetter, createCoverLetterResumeData } from "@reactive-resume/resume/cover-letter";
import { getLocaleMessages, resolveLocale } from "@/libs/locale";

/** Document translations stay independent of the app's active language. */
export async function createLetterWordsForLocale(locale: string): Promise<LetterWords> {
	const i18n = setupI18n();
	i18n.loadAndActivate(await getLocaleMessages(locale));

	return {
		greeting: (name: string) => t(i18n)`Dear ${name},`,
		teamGreeting: t(i18n)`Dear hiring team,`,
		hiringTeam: t(i18n)`Hiring team`,
		signOff: t(i18n)`Kind regards,`,
		formatDate: (date: string) =>
			new Date(`${date}T12:00:00Z`).toLocaleDateString(i18n.locale, {
				day: "numeric",
				month: "long",
				year: "numeric",
				timeZone: "UTC",
			}),
	};
}

export const letterWordsQueryOptions = (locale: string) =>
	queryOptions({
		queryKey: ["letter-words", resolveLocale(locale)],
		queryFn: () => createLetterWordsForLocale(locale),
		staleTime: Infinity,
	});

export const useLetterWords = (locale: string): LetterWords => useSuspenseQuery(letterWordsQueryOptions(locale)).data;

/** The letter as a one-section document the PDF renderer draws: sender header, recipient, greeting, body, sign-off. */
export const letterPageData = (letter: CoverLetter, words: LetterWords) =>
	createCoverLetterResumeData({ ...letter, ...composeCoverLetter(letter, words) });
