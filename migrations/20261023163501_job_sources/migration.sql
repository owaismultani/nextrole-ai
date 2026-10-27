CREATE TABLE "job_source_credentials" (
	"user_id" text,
	"source" text,
	"encrypted_fields" text NOT NULL,
	CONSTRAINT "job_source_credentials_pkey" PRIMARY KEY("user_id","source")
);
--> statement-breakpoint
ALTER TABLE "career_opportunity" ADD COLUMN "source" text DEFAULT 'web' NOT NULL;--> statement-breakpoint
ALTER TABLE "career_opportunity" ADD COLUMN "board" text;--> statement-breakpoint
ALTER TABLE "career_opportunity" ADD COLUMN "posted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "career_opportunity" ADD COLUMN "closed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "career_schedule" ADD COLUMN "sources" jsonb;--> statement-breakpoint
ALTER TABLE "career_schedule" ADD COLUMN "filters" jsonb;--> statement-breakpoint
CREATE INDEX "career_opportunity_user_id_board_index" ON "career_opportunity" ("user_id","board");--> statement-breakpoint
ALTER TABLE "job_source_credentials" ADD CONSTRAINT "job_source_credentials_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;