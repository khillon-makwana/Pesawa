CREATE TABLE "parse_issues" (
	"id" text PRIMARY KEY NOT NULL,
	"statement_id" text NOT NULL,
	"type" text NOT NULL,
	"page" integer,
	"raw_text" text,
	"detail" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "statements" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"file_name" text NOT NULL,
	"period_start" text NOT NULL,
	"period_end" text NOT NULL,
	"opening_balance" integer NOT NULL,
	"closing_balance" integer NOT NULL,
	"balance_verified" boolean NOT NULL,
	"row_count" integer NOT NULL,
	"parser_version" text NOT NULL,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"statement_id" text NOT NULL,
	"receipt_no" text NOT NULL,
	"completed_at" timestamp with time zone NOT NULL,
	"details_raw" text NOT NULL,
	"type" text NOT NULL,
	"direction" text NOT NULL,
	"amount" integer NOT NULL,
	"balance_after" integer NOT NULL,
	"is_revenue" boolean NOT NULL,
	"counterparty_name" text,
	"counterparty_phone" text,
	"charge_for_receipt" text,
	"reverses_receipt" text,
	"confidence" text NOT NULL,
	"source_page" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "parse_issues" ADD CONSTRAINT "parse_issues_statement_id_statements_id_fk" FOREIGN KEY ("statement_id") REFERENCES "public"."statements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "statements" ADD CONSTRAINT "statements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_statement_id_statements_id_fk" FOREIGN KEY ("statement_id") REFERENCES "public"."statements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_issues_statement" ON "parse_issues" USING btree ("statement_id");--> statement-breakpoint
CREATE INDEX "idx_statements_user" ON "statements" USING btree ("user_id","imported_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_tx_user_receipt" ON "transactions" USING btree ("user_id","receipt_no","type");--> statement-breakpoint
CREATE INDEX "idx_tx_statement" ON "transactions" USING btree ("statement_id");--> statement-breakpoint
CREATE INDEX "idx_tx_user_completed" ON "transactions" USING btree ("user_id","completed_at");