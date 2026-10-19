import type { RouterOutput } from "@/libs/orpc/client";

export type Application = RouterOutput["applications"]["list"][number];
