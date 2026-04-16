CREATE TABLE "pagamentos_pix" (
	"id" serial PRIMARY KEY NOT NULL,
	"comanda_id" integer NOT NULL,
	"mp_payment_id" text NOT NULL,
	"qr_code" text NOT NULL,
	"qr_code_base64" text NOT NULL,
	"valor" numeric(10, 2) NOT NULL,
	"taxa_gorjeta_snapshot" numeric(10, 2) DEFAULT '0' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"paid_at" timestamp with time zone,
	CONSTRAINT "pagamentos_pix_mp_payment_id_unique" UNIQUE("mp_payment_id")
);
--> statement-breakpoint
ALTER TABLE "pagamentos_pix" ADD CONSTRAINT "pagamentos_pix_comanda_id_comandas_id_fk" FOREIGN KEY ("comanda_id") REFERENCES "public"."comandas"("id") ON DELETE cascade ON UPDATE no action;