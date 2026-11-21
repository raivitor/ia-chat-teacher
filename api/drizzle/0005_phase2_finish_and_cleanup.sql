DROP TABLE IF EXISTS "items" CASCADE;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "finished_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "conversations_created_at_idx" ON "conversations" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "conversations_review_queue_idx" ON "conversations" USING btree ("finished_at","reviewed_at");--> statement-breakpoint
CREATE INDEX "messages_conversation_created_at_idx" ON "messages" USING btree ("conversation_id","created_at");