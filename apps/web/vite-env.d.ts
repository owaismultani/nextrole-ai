declare const __APP_VERSION__: string;
/** True when Vercel built this bundle (`VERCEL=1`). */
declare const __VERCEL__: boolean;

declare module "*.css";
declare module "*?url" {
	const url: string;
	export default url;
}
declare module "@fontsource/*" {}
declare module "@fontsource-variable/*" {}
