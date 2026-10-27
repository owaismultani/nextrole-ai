ALTER TABLE "career_job" ADD COLUMN "trigger" text DEFAULT 'schedule' NOT NULL;--> statement-breakpoint
ALTER TABLE "career_schedule" ADD COLUMN "interval_minutes" integer;--> statement-breakpoint
ALTER TABLE "career_schedule" ADD COLUMN "last_attempted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "career_schedule" ADD COLUMN "last_succeeded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "career_schedule" ADD COLUMN "last_run" jsonb;