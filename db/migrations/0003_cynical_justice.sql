ALTER TABLE "produtos" ADD COLUMN "custo_unitario" numeric(10, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "produtos" ADD COLUMN "estoque_maximo" numeric(12, 3) DEFAULT '0' NOT NULL;