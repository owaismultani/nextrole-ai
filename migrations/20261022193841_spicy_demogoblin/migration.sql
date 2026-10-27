ALTER TABLE "career_preparation" ADD COLUMN "output_generation" integer;--> statement-breakpoint
ALTER TABLE "career_preparation" ADD COLUMN "replaced_version_id" text;--> statement-breakpoint
-- Until now each generation made its own document, so an output belongs to the step's current generation.
UPDATE "career_preparation" SET "output_generation" = "generation" WHERE "output_id" IS NOT NULL;
