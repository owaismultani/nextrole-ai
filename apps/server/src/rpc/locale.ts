import type { Locale } from "@reactive-resume/utils/locale";
import { parse } from "hono/utils/cookie";
import { defaultLocale, isLocale } from "@reactive-resume/utils/locale";

export function getRequestLocale(request: Request): Locale {
	const locale = parse(request.headers.get("cookie") ?? "", "locale").locale;
	return isLocale(locale) ? locale : defaultLocale;
}
