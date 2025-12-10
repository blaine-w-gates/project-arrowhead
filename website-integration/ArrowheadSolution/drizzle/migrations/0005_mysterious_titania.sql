ALTER TABLE "dial_states" DROP CONSTRAINT "dial_states_left_item_id_rrgt_items_id_fk";
--> statement-breakpoint
ALTER TABLE "dial_states" DROP CONSTRAINT "dial_states_right_item_id_rrgt_items_id_fk";
--> statement-breakpoint
ALTER TABLE "dial_states" DROP CONSTRAINT "dial_states_selected_item_id_rrgt_items_id_fk";
--> statement-breakpoint
ALTER TABLE "dial_states" ADD COLUMN "left_plan_id" uuid;--> statement-breakpoint
ALTER TABLE "dial_states" ADD COLUMN "left_column_index" integer;--> statement-breakpoint
ALTER TABLE "dial_states" ADD COLUMN "left_text" text;--> statement-breakpoint
ALTER TABLE "dial_states" ADD COLUMN "right_plan_id" uuid;--> statement-breakpoint
ALTER TABLE "dial_states" ADD COLUMN "right_column_index" integer;--> statement-breakpoint
ALTER TABLE "dial_states" ADD COLUMN "selected_slot" text;--> statement-breakpoint
ALTER TABLE "dial_states" ADD CONSTRAINT "dial_states_left_plan_id_rrgt_plans_id_fk" FOREIGN KEY ("left_plan_id") REFERENCES "public"."rrgt_plans"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dial_states" ADD CONSTRAINT "dial_states_right_plan_id_rrgt_plans_id_fk" FOREIGN KEY ("right_plan_id") REFERENCES "public"."rrgt_plans"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dial_states" DROP COLUMN "left_item_id";--> statement-breakpoint
ALTER TABLE "dial_states" DROP COLUMN "right_item_id";--> statement-breakpoint
ALTER TABLE "dial_states" DROP COLUMN "selected_item_id";