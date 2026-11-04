CREATE TABLE "robot_positions" (
	"id" serial PRIMARY KEY,
	"robot_id" integer NOT NULL,
	"lat" double precision NOT NULL,
	"lon" double precision NOT NULL,
	"status" text NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "robot_positions_status_check" CHECK ("status" IN ('idle', 'moving'))
);
--> statement-breakpoint
CREATE INDEX "robot_positions_robot_id_recorded_at_idx" ON "robot_positions" ("robot_id","recorded_at");--> statement-breakpoint
ALTER TABLE "robot_positions" ADD CONSTRAINT "robot_positions_robot_id_robots_id_fkey" FOREIGN KEY ("robot_id") REFERENCES "robots"("id") ON DELETE CASCADE;