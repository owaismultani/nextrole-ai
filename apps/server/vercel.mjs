// Vercel service entrypoint. It must exist before the build, so it re-exports the adapter that tsdown emits.
export { default } from "./dist/vercel.mjs";
