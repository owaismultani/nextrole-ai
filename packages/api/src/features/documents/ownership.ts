import type { DbOrTx } from "@reactive-resume/db/client";
import { ORPCError } from "@orpc/client";
import { eq } from "drizzle-orm";
import * as schema from "@reactive-resume/db/schema";

/** Match application submission's owner-first order before document/application FK writes. */
export async function lockDocumentOwner(tx: DbOrTx, userId: string) {
	const [owner] = await tx
		.select({ id: schema.user.id })
		.from(schema.user)
		.where(eq(schema.user.id, userId))
		.for("no key update");
	if (!owner) throw new ORPCError("NOT_FOUND");
}
