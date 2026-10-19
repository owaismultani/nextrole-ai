import { describe, expect, it } from "vitest";
import { serializeStylesheetColor, toStylesheetPickerColor } from "./color-format";

describe("stylesheet picker color formatting", () => {
	it.each(["#e7000b", "#155dfc00", "#155dfc80", "#ffffff40", "#abcdef01", "#abcdeffe"])(
		"retains every color and alpha byte when reopening %s",
		(value) => expect(serializeStylesheetColor(toStylesheetPickerColor(value))).toBe(value),
	);
});
