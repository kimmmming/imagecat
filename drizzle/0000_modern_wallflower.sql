CREATE TABLE "generations" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"original_image_url" text NOT NULL,
	"generated_image_url" text,
	"style" varchar(50) DEFAULT 'cartoon',
	"status" varchar(20) DEFAULT 'pending',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"processing_time" integer
);
