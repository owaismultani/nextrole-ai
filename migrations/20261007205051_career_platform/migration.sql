CREATE TABLE "career_artifact" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"application_id" text,
	"interview_id" text,
	"title" text NOT NULL,
	"data" jsonb NOT NULL,
	"evidence" jsonb NOT NULL,
	"job_id" text,
	"input_version" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "career_fact" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"application_id" text,
	"text" text NOT NULL,
	"category" text NOT NULL,
	"source" jsonb NOT NULL,
	"source_key" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"revisions" jsonb DEFAULT '[]' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "career_job" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"schedule_id" text NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"lease" text,
	"lease_until" timestamp with time zone,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "career_notification" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"application_id" text,
	"key" text NOT NULL,
	"notice" jsonb NOT NULL,
	"url" text,
	"read_at" timestamp with time zone,
	"emailed_at" timestamp with time zone,
	"email_attempted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "career_opportunity" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"url" text NOT NULL,
	"role" text DEFAULT '' NOT NULL,
	"company" text DEFAULT '' NOT NULL,
	"location" text DEFAULT '' NOT NULL,
	"snippet" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"dismissed_at" timestamp with time zone,
	"tracked_application_id" text
);
--> statement-breakpoint
CREATE TABLE "career_profile" (
	"user_id" text PRIMARY KEY,
	"data" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "career_schedule" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"application_id" text,
	"interview_id" text,
	"kind" text NOT NULL,
	"query" text DEFAULT '' NOT NULL,
	"lead" text,
	"locale" text DEFAULT 'en-US' NOT NULL,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"email" boolean DEFAULT false NOT NULL,
	"next_run_at" timestamp with time zone NOT NULL,
	"last_queued_at" timestamp with time zone,
	"interval_days" integer,
	"ai_provider_id" text
);
--> statement-breakpoint
CREATE TABLE "career_story" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"application_id" text,
	"data" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "career_transcript" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"application_id" text,
	"original" text NOT NULL,
	"edited" text NOT NULL,
	"model" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "career_workspace" (
	"application_id" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"data" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_threads" ADD COLUMN "scope" text DEFAULT 'document' NOT NULL;--> statement-breakpoint
ALTER TABLE "agent_threads" ADD COLUMN "application_id" text;--> statement-breakpoint
ALTER TABLE "ai_providers" ADD COLUMN "is_default" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "timezone" text DEFAULT 'UTC' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "ai_providers_user_id_index" ON "ai_providers" ("user_id") WHERE "is_default";--> statement-breakpoint
CREATE INDEX "career_artifact_user_id_application_id_created_at_index" ON "career_artifact" ("user_id","application_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "career_artifact_job_id_index" ON "career_artifact" ("job_id");--> statement-breakpoint
CREATE INDEX "career_fact_user_id_application_id_status_index" ON "career_fact" ("user_id","application_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "career_fact_user_id_source_key_index" ON "career_fact" ("user_id","source_key");--> statement-breakpoint
CREATE UNIQUE INDEX "career_job_schedule_id_due_at_index" ON "career_job" ("schedule_id","due_at");--> statement-breakpoint
CREATE INDEX "career_job_status_lease_until_index" ON "career_job" ("status","lease_until");--> statement-breakpoint
CREATE UNIQUE INDEX "career_notification_user_id_key_index" ON "career_notification" ("user_id","key");--> statement-breakpoint
CREATE INDEX "career_notification_user_id_created_at_index" ON "career_notification" ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "career_opportunity_user_id_url_index" ON "career_opportunity" ("user_id","url");--> statement-breakpoint
CREATE INDEX "career_schedule_enabled_next_run_at_index" ON "career_schedule" ("enabled","next_run_at");--> statement-breakpoint
CREATE INDEX "career_story_user_id_application_id_index" ON "career_story" ("user_id","application_id");--> statement-breakpoint
CREATE INDEX "career_transcript_user_id_application_id_index" ON "career_transcript" ("user_id","application_id");--> statement-breakpoint
ALTER TABLE "agent_threads" ADD CONSTRAINT "agent_threads_application_id_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "application"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "career_artifact" ADD CONSTRAINT "career_artifact_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "career_artifact" ADD CONSTRAINT "career_artifact_application_id_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "application"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "career_artifact" ADD CONSTRAINT "career_artifact_job_id_career_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "career_job"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "career_fact" ADD CONSTRAINT "career_fact_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "career_fact" ADD CONSTRAINT "career_fact_application_id_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "application"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "career_job" ADD CONSTRAINT "career_job_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "career_job" ADD CONSTRAINT "career_job_schedule_id_career_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "career_schedule"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "career_notification" ADD CONSTRAINT "career_notification_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "career_notification" ADD CONSTRAINT "career_notification_application_id_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "application"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "career_opportunity" ADD CONSTRAINT "career_opportunity_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "career_opportunity" ADD CONSTRAINT "career_opportunity_tracked_application_id_application_id_fkey" FOREIGN KEY ("tracked_application_id") REFERENCES "application"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "career_profile" ADD CONSTRAINT "career_profile_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "career_schedule" ADD CONSTRAINT "career_schedule_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "career_schedule" ADD CONSTRAINT "career_schedule_application_id_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "application"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "career_schedule" ADD CONSTRAINT "career_schedule_ai_provider_id_ai_providers_id_fkey" FOREIGN KEY ("ai_provider_id") REFERENCES "ai_providers"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "career_story" ADD CONSTRAINT "career_story_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "career_story" ADD CONSTRAINT "career_story_application_id_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "application"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "career_transcript" ADD CONSTRAINT "career_transcript_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "career_transcript" ADD CONSTRAINT "career_transcript_application_id_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "application"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "career_workspace" ADD CONSTRAINT "career_workspace_application_id_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "application"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "career_workspace" ADD CONSTRAINT "career_workspace_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;