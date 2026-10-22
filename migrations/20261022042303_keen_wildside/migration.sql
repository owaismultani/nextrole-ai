CREATE TABLE "career_event" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"kind" text NOT NULL,
	"level" text DEFAULT 'info' NOT NULL,
	"run_id" text,
	"opportunity_id" text,
	"data" jsonb DEFAULT '{}' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "career_run_item" (
	"id" text PRIMARY KEY,
	"run_id" text NOT NULL,
	"user_id" text NOT NULL,
	"url" text NOT NULL,
	"host" text DEFAULT '' NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"decision" text NOT NULL
);
--> statement-breakpoint
CREATE INDEX "career_event_user_id_created_at_id_index" ON "career_event" ("user_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "career_event_opportunity_id_created_at_index" ON "career_event" ("opportunity_id","created_at");--> statement-breakpoint
CREATE INDEX "career_event_created_at_index" ON "career_event" ("created_at");--> statement-breakpoint
CREATE INDEX "career_run_item_run_id_index" ON "career_run_item" ("run_id");--> statement-breakpoint
ALTER TABLE "career_event" ADD CONSTRAINT "career_event_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "career_event" ADD CONSTRAINT "career_event_run_id_career_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "career_run"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "career_event" ADD CONSTRAINT "career_event_opportunity_id_career_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "career_opportunity"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "career_run_item" ADD CONSTRAINT "career_run_item_run_id_career_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "career_run"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "career_run_item" ADD CONSTRAINT "career_run_item_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;