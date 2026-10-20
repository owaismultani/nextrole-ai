CREATE TABLE "career_automation" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"schedule_id" text,
	"resumes_enabled" boolean DEFAULT false NOT NULL,
	"letters_enabled" boolean DEFAULT false NOT NULL,
	"baseline_resume_id" text,
	"ai_provider_id" text,
	"daily_limit" integer DEFAULT 10 NOT NULL,
	"retrieval_budget" integer DEFAULT 15 NOT NULL,
	"usage_day" text,
	"usage_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "career_preparation" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"opportunity_id" text NOT NULL,
	"application_id" text,
	"kind" text NOT NULL,
	"manual" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"generation" integer DEFAULT 1 NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"lease" text,
	"lease_until" timestamp with time zone,
	"counted" boolean DEFAULT false NOT NULL,
	"error" text,
	"issues" jsonb DEFAULT '[]' NOT NULL,
	"output_id" text,
	"baseline_resume_id" text,
	"baseline_version" text,
	"job_hash" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE UNIQUE INDEX "career_automation_user_id_index" ON "career_automation" ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "career_preparation_user_id_opportunity_id_kind_index" ON "career_preparation" ("user_id","opportunity_id","kind");--> statement-breakpoint
CREATE INDEX "career_preparation_status_next_attempt_at_index" ON "career_preparation" ("status","next_attempt_at");--> statement-breakpoint
CREATE INDEX "career_preparation_user_id_status_index" ON "career_preparation" ("user_id","status");--> statement-breakpoint
ALTER TABLE "career_automation" ADD CONSTRAINT "career_automation_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "career_automation" ADD CONSTRAINT "career_automation_schedule_id_career_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "career_schedule"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "career_automation" ADD CONSTRAINT "career_automation_baseline_resume_id_resume_id_fkey" FOREIGN KEY ("baseline_resume_id") REFERENCES "resume"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "career_automation" ADD CONSTRAINT "career_automation_ai_provider_id_ai_providers_id_fkey" FOREIGN KEY ("ai_provider_id") REFERENCES "ai_providers"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "career_preparation" ADD CONSTRAINT "career_preparation_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "career_preparation" ADD CONSTRAINT "career_preparation_opportunity_id_career_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "career_opportunity"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "career_preparation" ADD CONSTRAINT "career_preparation_application_id_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "application"("id") ON DELETE CASCADE;