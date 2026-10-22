// The UI fonts, bundled with the app (static instances of the Google Fonts files the web app serves; OFL notices
// next to them). Loaded under the family names `tokens.fonts` uses.
import { fonts } from "./tokens";

export const fontAssets = {
	[fonts.ui[400]]: require("../../assets/fonts/DMSans-Regular.ttf"),
	[fonts.ui[500]]: require("../../assets/fonts/DMSans-Medium.ttf"),
	[fonts.ui[600]]: require("../../assets/fonts/DMSans-SemiBold.ttf"),
	[fonts.ui[700]]: require("../../assets/fonts/DMSans-Bold.ttf"),
	[fonts.display[600]]: require("../../assets/fonts/Manrope-SemiBold.ttf"),
	[fonts.display[700]]: require("../../assets/fonts/Manrope-Bold.ttf"),
	[fonts.display[800]]: require("../../assets/fonts/Manrope-ExtraBold.ttf"),
	[fonts.paper]: require("../../assets/fonts/Newsreader-Regular.ttf"),
};
