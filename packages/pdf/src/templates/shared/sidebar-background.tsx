import { View } from "#react-pdf-renderer";
import { useRender } from "../../context";

type SidebarBackgroundProps = {
	color: string;
	/** The sidebar's width, as a percentage of the page. */
	width: string;
	/** Whether the sidebar sits at the end of the line (right, or left in RTL) rather than the start. */
	end?: boolean;
};

/**
 * Paints the sidebar column's colour down the whole height of every page, margins included, so a column that ends or
 * continues on a later page still reads as one band. Render it as a direct child of the page.
 */
export const SidebarBackground = ({ color, width, end = false }: SidebarBackgroundProps) => {
	const { columnsReversed } = useRender();
	const side = end !== columnsReversed ? "right" : "left";
	return <View fixed style={{ position: "absolute", top: 0, bottom: 0, [side]: 0, width, backgroundColor: color }} />;
};
