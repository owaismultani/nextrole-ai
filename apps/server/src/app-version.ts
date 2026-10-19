// @boundaries-ignore root release metadata
import { version } from "../../../package.json";

export const appVersion = typeof __APP_VERSION__ === "undefined" ? version : __APP_VERSION__;
