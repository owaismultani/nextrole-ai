CREATE TABLE "career_setup" (
	"user_id" text PRIMARY KEY,
	"baseline_resume_id" text,
	"baseline_confirmed_at" timestamp with time zone,
	"baseline_version" text,
	"skipped_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "career_setup" ADD CONSTRAINT "career_setup_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "career_setup" ADD CONSTRAINT "career_setup_baseline_resume_id_resume_id_fkey" FOREIGN KEY ("baseline_resume_id") REFERENCES "resume"("id") ON DELETE SET NULL;