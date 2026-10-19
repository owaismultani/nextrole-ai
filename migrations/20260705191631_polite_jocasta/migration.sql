CREATE TABLE "application" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"company" text NOT NULL,
	"role" text NOT NULL,
	"location" text,
	"salary" text,
	"status" text DEFAULT 'saved' NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"resume_id" text,
	"source" text,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"source_url" text,
	"job_description" text,
	"match_score" integer,
	"ai_metadata" jsonb,
	"notes" text,
	"resume_file_url" text,
	"resume_file_name" text,
	"cover_letter_url" text,
	"cover_letter_name" text,
	"follow_up_at" timestamp with time zone,
	"follow_up_note" text,
	"contacts" jsonb DEFAULT '[]' NOT NULL,
	"activity" jsonb DEFAULT '[]' NOT NULL,
	"applied_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "application_user_id_index" ON "application" ("user_id");--> statement-breakpoint
CREATE INDEX "application_user_id_updated_at_index" ON "application" ("user_id","updated_at" DESC NULLS LAST);--> statement-breakpoint
ALTER TABLE "application" ADD CONSTRAINT "application_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "application" ADD CONSTRAINT "application_resume_id_resume_id_fkey" FOREIGN KEY ("resume_id") REFERENCES "resume"("id") ON DELETE SET NULL;
