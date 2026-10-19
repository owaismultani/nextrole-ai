import { env } from "@reactive-resume/env/server";

export const isCareerSchedulingEnabled = () => env.CLOUDFLARE || process.env.VERCEL !== "1" || Boolean(env.CRON_SECRET);
