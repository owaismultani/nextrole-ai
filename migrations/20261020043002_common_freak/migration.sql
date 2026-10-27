ALTER TABLE "career_automation" DROP CONSTRAINT "career_automation_schedule_id_career_schedule_id_fkey";--> statement-breakpoint
ALTER TABLE "career_schedule" ADD COLUMN "retrieval_budget" integer;--> statement-breakpoint
ALTER TABLE "career_automation" DROP COLUMN "schedule_id";--> statement-breakpoint
ALTER TABLE "career_automation" DROP COLUMN "retrieval_budget";