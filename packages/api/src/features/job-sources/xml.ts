/**
 * Just enough XML for the two flat feeds that use it (Personio's job list and We Work Remotely's RSS). Elements are
 * found with indexOf, never nested regexes, so a hostile document can't make the scan quadratic.
 */
export function elements(xml: string, tag: string): string[] {
	const found: string[] = [];
	const open = `<${tag}`;
	const close = `</${tag}>`;
	let from = 0;
	while (found.length < 5_000) {
		const start = xml.indexOf(open, from);
		if (start === -1) break;
		const after = xml[start + open.length];
		// "<positionX" is another element; only "<position>" or "<position attr…>" match.
		if (after !== ">" && after !== " " && after !== "\n" && after !== "\t") {
			from = start + open.length;
			continue;
		}
		const bodyStart = xml.indexOf(">", start) + 1;
		const end = xml.indexOf(close, bodyStart);
		if (bodyStart === 0 || end === -1) break;
		found.push(xml.slice(bodyStart, end));
		from = end + close.length;
	}
	return found;
}

/** The first element's text, with CDATA unwrapped and the XML entities decoded. */
export function text(xml: string, tag: string): string {
	const [body] = elements(xml, tag);
	if (body === undefined) return "";
	const cdata = body.trim().match(/^<!\[CDATA\[([\s\S]*)\]\]>$/);
	return cdata?.[1] ?? decode(body);
}

export const decode = (value: string) =>
	value
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&apos;/g, "'")
		.replace(/&#(\d{1,7});/g, (_, code: string) => (Number(code) <= 0x10ffff ? String.fromCodePoint(Number(code)) : ""))
		.replace(/&amp;/g, "&");
