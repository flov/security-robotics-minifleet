CREATE TABLE IF NOT EXISTS "robots" (
	"id" serial PRIMARY KEY,
	"name" text NOT NULL,
	"status" text NOT NULL,
	"lat" double precision NOT NULL,
	"lon" double precision NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "robots_status_check" CHECK ("status" IN ('idle', 'moving'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY,
	"email" text NOT NULL UNIQUE,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
