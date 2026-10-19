// @vitest-environment happy-dom

import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FontWeightCombobox } from "./combobox";
import { getNextWeights } from "./get-next-weights";

const comboboxMock = vi.hoisted(() => ({
	props: undefined as { onValueChange?: (value: string[] | null) => void } | undefined,
}));

type ComboboxProps = {
	onValueChange?: (value: string[] | null) => void;
};

vi.mock("@/components/ui/combobox", () => ({
	Combobox: (props: ComboboxProps) => {
		comboboxMock.props = props;
		return null;
	},
}));

describe("FontWeightCombobox", () => {
	it("replaces the previous heading weight with one selected weight", () => {
		const onValueChange = vi.fn();
		render(<FontWeightCombobox single fontFamily="Source Sans 3" value={["600"]} onValueChange={onValueChange} />);
		comboboxMock.props?.onValueChange?.(["600", "700"]);
		expect(onValueChange).toHaveBeenCalledWith(["700"]);
	});
	it("selects regular and bold body weights, and one heading weight for a new family", () => {
		expect(getNextWeights("Source Sans 3")).toEqual(["400", "700"]);
		expect(getNextWeights("Source Sans 3", true)).toEqual(["600"]);
	});
	beforeEach(() => {
		comboboxMock.props = undefined;
	});

	it("emits selected font weights in ascending order", () => {
		const onValueChange = vi.fn();

		render(<FontWeightCombobox fontFamily="Source Sans 3" value={["400"]} onValueChange={onValueChange} />);

		comboboxMock.props?.onValueChange?.(["800", "600", "400"]);

		expect(onValueChange).toHaveBeenCalledWith(["400", "600", "800"]);
	});
});
