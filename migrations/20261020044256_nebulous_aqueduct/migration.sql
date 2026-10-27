CREATE TABLE "career_run" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"schedule_id" text NOT NULL,
	"report" jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "career_opportunity" ADD COLUMN "run_id" text;--> statement-breakpoint
CREATE INDEX "career_run_user_id_created_at_id_index" ON "career_run" ("user_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "career_run_schedule_id_created_at_index" ON "career_run" ("schedule_id","created_at" DESC NULLS LAST);--> statement-breakpoint
ALTER TABLE "career_opportunity" ADD CONSTRAINT "career_opportunity_run_id_career_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "career_run"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "career_run" ADD CONSTRAINT "career_run_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "career_run" ADD CONSTRAINT "career_run_schedule_id_career_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "career_schedule"("id") ON DELETE CASCADE;