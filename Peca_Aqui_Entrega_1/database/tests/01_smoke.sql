-- Roda sobre banco recém-inicializado com seed; alterações são revertidas no final.
\set ON_ERROR_STOP on
BEGIN;
SET search_path TO peca_aqui,public;
DO $$
DECLARE v_product BIGINT; v_sale BIGINT; v_actor BIGINT; v_stock NUMERIC; v_return BIGINT;
 v_closing BIGINT; v_customer BIGINT; v_paid BIGINT; v_due NUMERIC; v_purchase BIGINT;
 v_sale_ids BIGINT[]; v_failed BOOLEAN;
BEGIN
 SELECT id INTO v_product FROM products WHERE internal_code='PA-FILT-001';
 SELECT id INTO v_actor FROM users WHERE email='admin@demo.invalid';
 SELECT id INTO v_sale FROM sales WHERE notes='Venda de teste';
 IF v_product IS NULL OR v_actor IS NULL OR v_sale IS NULL THEN
   RAISE EXCEPTION 'Dados de demonstração ausentes: execute database/init/04_seed.sql após aplicar o patch 001';
 END IF;
 SELECT quantity INTO v_stock FROM stock_balances WHERE product_id=v_product;
 IF v_stock IS DISTINCT FROM 32 THEN RAISE EXCEPTION 'Teste falhou: estoque inicial esperado 32, obtido %',v_stock; END IF;
 IF (SELECT net_total FROM v_sale_totals WHERE sale_id=v_sale)<>119.80 THEN
  RAISE EXCEPTION 'Teste falhou: total da venda'; END IF;

 -- Devolução parcial: 32 -> 33; não permite devolução além do que foi vendido.
 INSERT INTO returns(sale_id,actor_id,reason) VALUES(v_sale,v_actor,'Devolução de teste') RETURNING id INTO v_return;
 INSERT INTO return_items(return_id,sale_item_id,quantity)
 SELECT v_return,id,1 FROM sale_items WHERE sale_id=v_sale;
 PERFORM confirm_return(v_return,v_actor);
 IF (SELECT quantity FROM stock_balances WHERE product_id=v_product)<>33 THEN
  RAISE EXCEPTION 'Teste falhou: devolução não atualizou estoque'; END IF;
 IF (SELECT net_total FROM v_sale_totals WHERE sale_id=v_sale)<>59.90 THEN
  RAISE EXCEPTION 'Teste falhou: venda líquida após devolução'; END IF;

 v_failed:=false;
 BEGIN
  INSERT INTO returns(sale_id,actor_id,reason) VALUES(v_sale,v_actor,'Excesso de devolução') RETURNING id INTO v_return;
  INSERT INTO return_items(return_id,sale_item_id,quantity)
  SELECT v_return,id,2 FROM sale_items WHERE sale_id=v_sale;
  PERFORM confirm_return(v_return,v_actor);
 EXCEPTION WHEN OTHERS THEN v_failed:=true; END;
 IF NOT v_failed THEN RAISE EXCEPTION 'Teste falhou: devolução excessiva foi aceita'; END IF;

 -- Cancelamento compensa somente saldo não devolvido: 33 -> 34.
 PERFORM cancel_sale(v_sale,v_actor,'Cancelamento de teste');
 IF (SELECT quantity FROM stock_balances WHERE product_id=v_product)<>34 THEN
  RAISE EXCEPTION 'Teste falhou: cancelamento duplicou estoque'; END IF;
 IF (SELECT net_total FROM v_sale_totals WHERE sale_id=v_sale)<>0 THEN
  RAISE EXCEPTION 'Teste falhou: venda cancelada ainda conta no faturamento'; END IF;
 v_failed:=false;
 BEGIN PERFORM cancel_sale(v_sale,v_actor,'Repetição indevida');
 EXCEPTION WHEN OTHERS THEN v_failed:=true; END;
 IF NOT v_failed THEN RAISE EXCEPTION 'Teste falhou: cancelamento duplicado permitido'; END IF;

 -- Venda acima do estoque deve falhar e não pode alterar o saldo.
 INSERT INTO sales(customer_id,customer_label,seller_id,notes,payment_terms)
 VALUES(NULL,'AO CONSUMIDOR',v_actor,'Teste sem saldo','IMMEDIATE') RETURNING id INTO v_sale;
 INSERT INTO sale_items(sale_id,product_id,quantity,practiced_price)
 VALUES(v_sale,v_product,99999,10);
 v_failed:=false;
 BEGIN PERFORM confirm_sale(v_sale,v_actor);
 EXCEPTION WHEN OTHERS THEN v_failed:=true; END;
 IF NOT v_failed THEN RAISE EXCEPTION 'Teste falhou: venda acima do estoque aceita'; END IF;
 IF (SELECT quantity FROM stock_balances WHERE product_id=v_product)<>34 THEN
  RAISE EXCEPTION 'Teste falhou: venda inválida alterou estoque'; END IF;

 -- Compra confirmada duas vezes precisa ser recusada.
 SELECT id INTO v_purchase FROM purchases WHERE document_number='NFE-EXEMPLO-001';
 v_failed:=false;
 BEGIN PERFORM confirm_purchase(v_purchase,v_actor);
 EXCEPTION WHEN OTHERS THEN v_failed:=true; END;
 IF NOT v_failed THEN RAISE EXCEPTION 'Teste falhou: compra duplicada'; END IF;

 -- Fechamento com duas vendas a prazo, pagamento parcial e final.
 SELECT id INTO v_customer FROM customers WHERE document='00000000001';
 SELECT ARRAY(SELECT id FROM sales WHERE notes IN ('Ordem semanal A','Ordem semanal B') ORDER BY id)
 INTO v_sale_ids;
 v_closing:=create_closing(v_customer,v_actor,CURRENT_DATE,CURRENT_DATE,v_sale_ids);
 IF (SELECT total FROM v_closing_balances WHERE closing_id=v_closing)<>244 THEN
  RAISE EXCEPTION 'Teste falhou: total do fechamento'; END IF;
 v_paid:=register_payment(v_actor,100,'PIX',NULL,v_closing,'TEST-PAID-1');
 IF v_paid<>register_payment(v_actor,100,'PIX',NULL,v_closing,'TEST-PAID-1') THEN
  RAISE EXCEPTION 'Teste falhou: idempotência do pagamento'; END IF;
 v_failed:=false;
 BEGIN PERFORM register_payment(v_actor,99,'PIX',NULL,v_closing,'TEST-PAID-1');
 EXCEPTION WHEN OTHERS THEN v_failed:=true; END;
 IF NOT v_failed THEN RAISE EXCEPTION 'Teste falhou: idempotência com payload divergente'; END IF;
 IF (SELECT due FROM v_closing_balances WHERE closing_id=v_closing)<>144 THEN
  RAISE EXCEPTION 'Teste falhou: pagamento parcial'; END IF;
 PERFORM register_payment(v_actor,144,'CASH',NULL,v_closing,'TEST-PAID-2');
 IF (SELECT due FROM v_closing_balances WHERE closing_id=v_closing)<>0 THEN
  RAISE EXCEPTION 'Teste falhou: pagamento final'; END IF;
 v_failed:=false;
 BEGIN PERFORM register_payment(v_actor,1,'PIX',NULL,v_closing,NULL);
 EXCEPTION WHEN OTHERS THEN v_failed:=true; END;
 IF NOT v_failed THEN RAISE EXCEPTION 'Teste falhou: pagamento excedente permitido'; END IF;

 -- Ledger não aceita UPDATE em movimentações já gravadas.
 v_failed:=false;
 BEGIN UPDATE stock_movements SET delta=delta WHERE product_id=v_product;
 EXCEPTION WHEN OTHERS THEN v_failed:=true; END;
 IF NOT v_failed THEN RAISE EXCEPTION 'Teste falhou: ledger permitiu atualização'; END IF;

 -- Invariantes do ledger, equivalência bidirecional e auditoria.
 IF (SELECT count(*) FROM v_equivalences_bidirectional WHERE active)<>2 THEN
   RAISE EXCEPTION 'Teste falhou: equivalências não bidirecionais'; END IF;
 IF NOT EXISTS(SELECT 1 FROM audit_events WHERE entity='sales') THEN
   RAISE EXCEPTION 'Teste falhou: auditoria de vendas'; END IF;
 IF EXISTS(SELECT 1 FROM stock_balances WHERE quantity<0) THEN
   RAISE EXCEPTION 'Teste falhou: saldo negativo'; END IF;
 RAISE NOTICE 'OK: compra, venda, devolução, cancelamento, fechamento, pagamento, saldo e auditoria';
END $$;
ROLLBACK;
SELECT 'OK — testes concluídos; banco de demonstração preservado' AS resultado;
