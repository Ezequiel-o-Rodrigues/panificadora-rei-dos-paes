CREATE INDEX "caixa_sessoes_status_idx" ON "caixa_sessoes" USING btree ("status");--> statement-breakpoint
CREATE INDEX "comandas_sessao_status_idx" ON "comandas" USING btree ("caixa_sessao_id","status");--> statement-breakpoint
CREATE INDEX "comandas_numero_idx" ON "comandas" USING btree ("numero");--> statement-breakpoint
CREATE INDEX "itens_comanda_comanda_idx" ON "itens_comanda" USING btree ("comanda_id");--> statement-breakpoint
CREATE UNIQUE INDEX "itens_comanda_comanda_produto_uq" ON "itens_comanda" USING btree ("comanda_id","produto_id");--> statement-breakpoint
CREATE INDEX "produtos_pdv_idx" ON "produtos" USING btree ("ativo","disponivel_hoje");