-- PEÇA-AQUI | V002 | Funções de negócio e integridade
BEGIN;
SET search_path TO peca_aqui, public;

CREATE FUNCTION current_actor_id() RETURNS BIGINT LANGUAGE plpgsql STABLE SET search_path=peca_aqui,public AS $$
DECLARE v TEXT;
BEGIN
 v := nullif(current_setting('app.actor_id',TRUE),'');
 RETURN CASE WHEN v ~ '^[0-9]+$' THEN v::BIGINT ELSE NULL END;
END $$;

CREATE FUNCTION audit_row() RETURNS TRIGGER LANGUAGE plpgsql SET search_path=peca_aqui,public AS $$
DECLARE v_id TEXT;
BEGIN
 v_id := COALESCE(to_jsonb(NEW)->>'id',to_jsonb(OLD)->>'id');
 INSERT INTO audit_events(actor_id,entity,record_id,action,old_value,new_value)
 VALUES(current_actor_id(),TG_TABLE_NAME,v_id,TG_OP,
       CASE WHEN TG_OP='INSERT' THEN NULL ELSE to_jsonb(OLD)-'password_hash' END,
       CASE WHEN TG_OP='DELETE' THEN NULL ELSE to_jsonb(NEW)-'password_hash' END);
 RETURN COALESCE(NEW,OLD);
END $$;
-- Auditoria é evento de negócio, não substitui permissões no backend.
CREATE TRIGGER audit_products AFTER INSERT OR UPDATE ON products FOR EACH ROW EXECUTE FUNCTION audit_row();
CREATE TRIGGER audit_equivalences AFTER INSERT OR UPDATE ON product_equivalences FOR EACH ROW EXECUTE FUNCTION audit_row();
CREATE TRIGGER audit_purchases AFTER INSERT OR UPDATE ON purchases FOR EACH ROW EXECUTE FUNCTION audit_row();
CREATE TRIGGER audit_sales AFTER INSERT OR UPDATE ON sales FOR EACH ROW EXECUTE FUNCTION audit_row();
CREATE TRIGGER audit_cancellations AFTER INSERT ON sale_cancellations FOR EACH ROW EXECUTE FUNCTION audit_row();
CREATE TRIGGER audit_returns AFTER INSERT OR UPDATE ON returns FOR EACH ROW EXECUTE FUNCTION audit_row();
CREATE TRIGGER audit_payments AFTER INSERT OR UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION audit_row();
CREATE TRIGGER audit_closings AFTER INSERT ON closings FOR EACH ROW EXECUTE FUNCTION audit_row();
CREATE TRIGGER audit_reminders AFTER INSERT OR UPDATE ON reminders FOR EACH ROW EXECUTE FUNCTION audit_row();
CREATE TRIGGER audit_users AFTER INSERT OR UPDATE ON users FOR EACH ROW EXECUTE FUNCTION audit_row();

CREATE FUNCTION track_product_prices() RETURNS TRIGGER LANGUAGE plpgsql SET search_path=peca_aqui,public AS $$
BEGIN
 IF (OLD.current_cost,OLD.manual_margin,OLD.standard_price) IS DISTINCT FROM
    (NEW.current_cost,NEW.manual_margin,NEW.standard_price) THEN
   INSERT INTO product_price_history(product_id,changed_by,old_cost,new_cost,old_margin,new_margin,old_price,new_price)
   VALUES (NEW.id,current_actor_id(),OLD.current_cost,NEW.current_cost,OLD.manual_margin,NEW.manual_margin,OLD.standard_price,NEW.standard_price);
 END IF;
 NEW.updated_at := now();
 RETURN NEW;
END $$;
CREATE TRIGGER products_price_history BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION track_product_prices();

CREATE FUNCTION forbid_movement_change() RETURNS TRIGGER LANGUAGE plpgsql SET search_path=peca_aqui,public AS $$
BEGIN RAISE EXCEPTION 'Movimentação de estoque é imutável: use movimento compensatório'; END $$;
CREATE TRIGGER guard_stock_immutable BEFORE UPDATE OR DELETE ON stock_movements FOR EACH ROW EXECUTE FUNCTION forbid_movement_change();

CREATE FUNCTION apply_stock_movement() RETURNS TRIGGER LANGUAGE plpgsql SET search_path=peca_aqui,public AS $$
DECLARE v_q NUMERIC(14,3);
BEGIN
 -- Entradas sempre criam saldo não negativo ou incrementam um existente.
 -- Saídas usam UPDATE condicional para evitar CHECK(quantity >= 0)
 -- antes do ON CONFLICT. O UPDATE obtém lock na linha e é seguro
 -- contra duas saídas concorrentes do mesmo produto.
 IF NEW.delta > 0 THEN
   INSERT INTO stock_balances(product_id,quantity,updated_at)
   VALUES (NEW.product_id,NEW.delta,now())
   ON CONFLICT (product_id) DO UPDATE
      SET quantity = stock_balances.quantity + EXCLUDED.quantity,
          updated_at = now()
   RETURNING quantity INTO v_q;
 ELSE
   UPDATE stock_balances
      SET quantity = quantity + NEW.delta,
          updated_at = now()
    WHERE product_id = NEW.product_id
      AND quantity + NEW.delta >= 0
   RETURNING quantity INTO v_q;
   IF NOT FOUND THEN
      RAISE EXCEPTION 'Estoque insuficiente para produto % (variação %)',
            NEW.product_id,NEW.delta;
   END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER stock_apply AFTER INSERT ON stock_movements FOR EACH ROW EXECUTE FUNCTION apply_stock_movement();
CREATE TRIGGER audit_movements AFTER INSERT ON stock_movements FOR EACH ROW EXECUTE FUNCTION audit_row();

CREATE FUNCTION guard_draft_item() RETURNS TRIGGER LANGUAGE plpgsql SET search_path=peca_aqui,public AS $$
DECLARE v_status TEXT; v_parent BIGINT;
BEGIN
 IF TG_TABLE_NAME = 'purchase_items' THEN
   v_parent:=CASE WHEN TG_OP='DELETE' THEN OLD.purchase_id ELSE NEW.purchase_id END;
   SELECT status INTO v_status FROM purchases WHERE id=v_parent FOR UPDATE;
 ELSIF TG_TABLE_NAME = 'sale_items' THEN
   v_parent:=CASE WHEN TG_OP='DELETE' THEN OLD.sale_id ELSE NEW.sale_id END;
   SELECT status INTO v_status FROM sales WHERE id=v_parent FOR UPDATE;
 ELSE
   v_parent:=CASE WHEN TG_OP='DELETE' THEN OLD.return_id ELSE NEW.return_id END;
   SELECT status INTO v_status FROM returns WHERE id=v_parent FOR UPDATE;
 END IF;
 IF v_status <> 'DRAFT' THEN
   RAISE EXCEPTION 'Itens só podem ser alterados no rascunho (% id=%)',TG_TABLE_NAME,v_parent;
 END IF;
 RETURN COALESCE(NEW,OLD);
END $$;
CREATE TRIGGER guard_purchase_items BEFORE INSERT OR UPDATE OR DELETE ON purchase_items FOR EACH ROW EXECUTE FUNCTION guard_draft_item();
CREATE TRIGGER guard_sale_items BEFORE INSERT OR UPDATE OR DELETE ON sale_items FOR EACH ROW EXECUTE FUNCTION guard_draft_item();
CREATE TRIGGER guard_return_items BEFORE INSERT OR UPDATE OR DELETE ON return_items FOR EACH ROW EXECUTE FUNCTION guard_draft_item();

CREATE FUNCTION suggested_price(p_cost NUMERIC,p_margin NUMERIC) RETURNS NUMERIC LANGUAGE SQL IMMUTABLE AS $$
 SELECT round(p_cost / (1-p_margin),2) $$;

CREATE FUNCTION confirm_purchase(p_purchase_id BIGINT,p_actor_id BIGINT) RETURNS VOID
LANGUAGE plpgsql SET search_path=peca_aqui,public AS $$
DECLARE r RECORD; v_status TEXT;
BEGIN
 PERFORM set_config('app.actor_id',p_actor_id::TEXT,TRUE);
 SELECT status INTO v_status FROM purchases WHERE id=p_purchase_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Compra % inexistente',p_purchase_id; END IF;
 IF v_status <> 'DRAFT' THEN RAISE EXCEPTION 'Compra já confirmada'; END IF;
 IF NOT EXISTS (SELECT 1 FROM purchase_items WHERE purchase_id=p_purchase_id) THEN
   RAISE EXCEPTION 'Compra sem itens'; END IF;
 -- lock ordenado dos produtos para evitar deadlocks entre operações concorrentes.
 PERFORM 1 FROM products WHERE id IN (SELECT product_id FROM purchase_items WHERE purchase_id=p_purchase_id)
 ORDER BY id FOR UPDATE;
 FOR r IN SELECT * FROM purchase_items WHERE purchase_id=p_purchase_id ORDER BY product_id LOOP
   UPDATE products SET current_cost=r.unit_cost WHERE id=r.product_id;
   INSERT INTO stock_movements(product_id,actor_id,kind,delta,purchase_item_id)
   VALUES (r.product_id,p_actor_id,'PURCHASE_IN',r.quantity,r.id);
 END LOOP;
 UPDATE purchases SET status='CONFIRMED',confirmed_at=now() WHERE id=p_purchase_id;
END $$;

CREATE FUNCTION confirm_sale(p_sale_id BIGINT,p_actor_id BIGINT) RETURNS VOID
LANGUAGE plpgsql SET search_path=peca_aqui,public AS $$
DECLARE r RECORD; v_status TEXT; v_customer BIGINT; v_terms TEXT;
BEGIN
 PERFORM set_config('app.actor_id',p_actor_id::TEXT,TRUE);
 SELECT status,customer_id,payment_terms INTO v_status,v_customer,v_terms
 FROM sales WHERE id=p_sale_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Venda inexistente'; END IF;
 IF v_status <> 'DRAFT' THEN RAISE EXCEPTION 'Venda já confirmada/cancelada'; END IF;
 IF v_terms='DEFERRED' AND v_customer IS NULL THEN RAISE EXCEPTION 'Venda a prazo exige cliente cadastrado'; END IF;
 IF NOT EXISTS (SELECT 1 FROM sale_items WHERE sale_id=p_sale_id) THEN RAISE EXCEPTION 'Venda sem itens'; END IF;
 PERFORM 1 FROM products WHERE id IN (SELECT product_id FROM sale_items WHERE sale_id=p_sale_id)
 ORDER BY id FOR UPDATE;
 FOR r IN SELECT si.id,si.product_id,si.quantity,p.internal_code,p.description,
       p.current_cost,p.standard_price,p.active
    FROM sale_items si JOIN products p ON p.id=si.product_id
    WHERE si.sale_id=p_sale_id ORDER BY si.product_id LOOP
   IF NOT r.active THEN RAISE EXCEPTION 'Produto % inativo',r.product_id; END IF;
   UPDATE sale_items SET code_snapshot=r.internal_code,description_snapshot=r.description,
       cost_snapshot=r.current_cost,reference_price_snapshot=r.standard_price
   WHERE id=r.id;
   INSERT INTO stock_movements(product_id,actor_id,kind,delta,sale_item_id)
   VALUES(r.product_id,p_actor_id,'SALE_OUT',-r.quantity,r.id);
 END LOOP;
 UPDATE sales SET status='CONFIRMED',confirmed_at=now() WHERE id=p_sale_id;
END $$;

CREATE FUNCTION confirm_return(p_return_id BIGINT,p_actor_id BIGINT) RETURNS VOID
LANGUAGE plpgsql SET search_path=peca_aqui,public AS $$
DECLARE r RECORD; v_ret RECORD; v_sale_status TEXT; v_sale_id BIGINT; v_prev NUMERIC(14,3);
BEGIN
 PERFORM set_config('app.actor_id',p_actor_id::TEXT,TRUE);
 SELECT * INTO v_ret FROM returns WHERE id=p_return_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Devolução inexistente'; END IF;
 IF v_ret.status <> 'DRAFT' THEN RAISE EXCEPTION 'Devolução já confirmada'; END IF;
 v_sale_id:=v_ret.sale_id;
 SELECT status INTO v_sale_status FROM sales WHERE id=v_sale_id FOR UPDATE;
 IF v_sale_status <> 'CONFIRMED' THEN RAISE EXCEPTION 'A venda não permite devolução'; END IF;
 IF NOT EXISTS(SELECT 1 FROM return_items WHERE return_id=p_return_id) THEN RAISE EXCEPTION 'Devolução sem itens'; END IF;
 FOR r IN SELECT ri.id,ri.sale_item_id,ri.quantity,si.sale_id,si.product_id,si.quantity AS sold_quantity
     FROM return_items ri JOIN sale_items si ON si.id=ri.sale_item_id
     WHERE ri.return_id=p_return_id ORDER BY si.product_id LOOP
   IF r.sale_id<>v_sale_id THEN RAISE EXCEPTION 'Item de outra venda na devolução'; END IF;
   SELECT COALESCE(sum(ri2.quantity),0) INTO v_prev FROM return_items ri2
     JOIN returns r2 ON r2.id=ri2.return_id
     WHERE ri2.sale_item_id=r.sale_item_id AND r2.status='CONFIRMED';
   IF v_prev+r.quantity>r.sold_quantity THEN RAISE EXCEPTION 'Quantidade devolvida excede a vendida (item %)',r.sale_item_id; END IF;
   INSERT INTO stock_movements(product_id,actor_id,kind,delta,return_item_id)
   VALUES(r.product_id,p_actor_id,'RETURN_IN',r.quantity,r.id);
 END LOOP;
 UPDATE returns SET status='CONFIRMED',confirmed_at=now() WHERE id=p_return_id;
 -- Ajusta a parcela incluída em fechamento; não apaga recebimentos históricos.
 UPDATE closing_items ci SET amount_considered=GREATEST(0,
  (SELECT round(sum(si.quantity*si.practiced_price),2) FROM sale_items si WHERE si.sale_id=v_sale_id)
  -(SELECT COALESCE(sum(ri.quantity*si.practiced_price),0) FROM return_items ri
    JOIN returns rt ON rt.id=ri.return_id JOIN sale_items si ON si.id=ri.sale_item_id
    WHERE rt.sale_id=v_sale_id AND rt.status='CONFIRMED')
  -(SELECT COALESCE(sum(p.amount),0) FROM payments p WHERE p.sale_id=v_sale_id AND p.status='CONFIRMED'))
 WHERE ci.sale_id=v_sale_id;
END $$;

CREATE FUNCTION cancel_sale(p_sale_id BIGINT,p_actor_id BIGINT,p_reason TEXT) RETURNS VOID
LANGUAGE plpgsql SET search_path=peca_aqui,public AS $$
DECLARE r RECORD; v_status TEXT; v_cancellation BIGINT; v_prev NUMERIC(14,3); v_remaining NUMERIC(14,3);
BEGIN
 PERFORM set_config('app.actor_id',p_actor_id::TEXT,TRUE);
 SELECT status INTO v_status FROM sales WHERE id=p_sale_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Venda inexistente'; END IF;
 IF v_status <> 'CONFIRMED' THEN RAISE EXCEPTION 'Somente venda confirmada pode ser cancelada'; END IF;
 INSERT INTO sale_cancellations(sale_id,actor_id,reason)
 VALUES(p_sale_id,p_actor_id,p_reason) RETURNING id INTO v_cancellation;
 FOR r IN SELECT * FROM sale_items WHERE sale_id=p_sale_id ORDER BY product_id LOOP
   SELECT COALESCE(sum(ri.quantity),0) INTO v_prev FROM return_items ri
    JOIN returns ret ON ret.id=ri.return_id
    WHERE ri.sale_item_id=r.id AND ret.status='CONFIRMED';
   v_remaining:=r.quantity-v_prev;
   IF v_remaining>0 THEN
    INSERT INTO stock_movements(product_id,actor_id,kind,delta,sale_item_id,cancellation_id)
    VALUES(r.product_id,p_actor_id,'CANCELLATION_IN',v_remaining,r.id,v_cancellation);
   END IF;
 END LOOP;
 UPDATE sales SET status='CANCELLED' WHERE id=p_sale_id;
 UPDATE closing_items SET amount_considered=0 WHERE sale_id=p_sale_id;
END $$;

CREATE FUNCTION adjust_stock(p_product_id BIGINT,p_new_qty NUMERIC,p_actor_id BIGINT,p_reason TEXT)
RETURNS NUMERIC LANGUAGE plpgsql SET search_path=peca_aqui,public AS $$
DECLARE v_old NUMERIC(14,3); v_delta NUMERIC(14,3);
BEGIN
 PERFORM set_config('app.actor_id',p_actor_id::TEXT,TRUE);
 IF p_new_qty < 0 OR p_new_qty IS NULL THEN RAISE EXCEPTION 'Quantidade final inválida'; END IF;
 IF p_reason IS NULL OR length(btrim(p_reason))<3 THEN RAISE EXCEPTION 'Motivo obrigatório'; END IF;
 PERFORM 1 FROM products WHERE id=p_product_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Produto inexistente'; END IF;
 INSERT INTO stock_balances(product_id,quantity) VALUES(p_product_id,0) ON CONFLICT DO NOTHING;
 SELECT quantity INTO v_old FROM stock_balances WHERE product_id=p_product_id FOR UPDATE;
 v_delta:=p_new_qty-v_old;
 IF v_delta<>0 THEN
 INSERT INTO stock_movements(product_id,actor_id,kind,delta,reason)
 VALUES(p_product_id,p_actor_id,CASE WHEN v_delta>0 THEN 'ADJUSTMENT_IN' ELSE 'ADJUSTMENT_OUT' END,v_delta,p_reason);
 END IF;
 RETURN v_delta;
END $$;

CREATE FUNCTION create_closing(p_customer_id BIGINT,p_actor_id BIGINT,p_from DATE,p_to DATE,p_sale_ids BIGINT[])
RETURNS BIGINT LANGUAGE plpgsql SET search_path=peca_aqui,public AS $$
DECLARE v_id BIGINT; v_sale BIGINT; v_check RECORD; v_amount NUMERIC(14,2);
BEGIN
 PERFORM set_config('app.actor_id',p_actor_id::TEXT,TRUE);
 IF p_from IS NULL OR p_to IS NULL OR p_from>p_to THEN RAISE EXCEPTION 'Período inválido'; END IF;
 IF COALESCE(cardinality(p_sale_ids),0)=0 THEN RAISE EXCEPTION 'Fechamento sem vendas'; END IF;
 PERFORM 1 FROM customers WHERE id=p_customer_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Cliente inexistente'; END IF;
 -- Ordem fixa de locks das vendas para múltiplos fechamentos concorrentes.
 PERFORM 1 FROM sales WHERE id=ANY(p_sale_ids) ORDER BY id FOR UPDATE;
 IF (SELECT count(*) FROM sales WHERE id=ANY(p_sale_ids))<>cardinality(p_sale_ids) THEN
  RAISE EXCEPTION 'Vendas duplicadas ou inexistentes'; END IF;
 INSERT INTO closings(customer_id,actor_id,period_start,period_end)
 VALUES(p_customer_id,p_actor_id,p_from,p_to) RETURNING id INTO v_id;
 FOREACH v_sale IN ARRAY p_sale_ids LOOP
   SELECT s.customer_id,s.payment_terms,s.status,s.created_at INTO v_check FROM sales s WHERE s.id=v_sale;
   IF v_check.customer_id IS DISTINCT FROM p_customer_id OR v_check.status<>'CONFIRMED'
      OR v_check.payment_terms<>'DEFERRED' OR v_check.created_at::date NOT BETWEEN p_from AND p_to THEN
      RAISE EXCEPTION 'Venda % não elegível ao fechamento',v_sale;
   END IF;
   SELECT GREATEST(0,st.net_total-COALESCE((SELECT sum(amount) FROM payments WHERE sale_id=v_sale AND status='CONFIRMED'),0))
   INTO v_amount FROM v_sale_totals st WHERE st.sale_id=v_sale;
   IF v_amount IS NULL OR v_amount<=0 THEN RAISE EXCEPTION 'Venda % sem saldo aberto',v_sale; END IF;
   INSERT INTO closing_items(closing_id,sale_id,amount_considered) VALUES(v_id,v_sale,v_amount);
 END LOOP;
 RETURN v_id;
END $$;

CREATE FUNCTION register_payment(p_actor_id BIGINT,p_amount NUMERIC,p_method VARCHAR,
    p_sale_id BIGINT DEFAULT NULL,p_closing_id BIGINT DEFAULT NULL,p_idempotency_key VARCHAR DEFAULT NULL)
RETURNS BIGINT LANGUAGE plpgsql SET search_path=peca_aqui,public AS $$
DECLARE v_due NUMERIC(14,2); v_id BIGINT; v_status TEXT; v_prior payments%ROWTYPE;
BEGIN
 PERFORM set_config('app.actor_id',p_actor_id::TEXT,TRUE);
 IF p_amount IS NULL OR p_amount<=0 THEN RAISE EXCEPTION 'Valor de pagamento inválido'; END IF;
 IF (p_sale_id IS NULL)=(p_closing_id IS NULL) THEN RAISE EXCEPTION 'Informe exatamente uma venda ou fechamento'; END IF;
 IF p_idempotency_key IS NOT NULL THEN
   SELECT * INTO v_prior FROM payments WHERE idempotency_key=p_idempotency_key;
   IF FOUND THEN
     IF v_prior.amount IS DISTINCT FROM p_amount OR v_prior.method IS DISTINCT FROM p_method
       OR v_prior.sale_id IS DISTINCT FROM p_sale_id OR v_prior.closing_id IS DISTINCT FROM p_closing_id THEN
       RAISE EXCEPTION 'Chave de idempotência reutilizada com dados diferentes';
     END IF;
     RETURN v_prior.id;
   END IF;
 END IF;
 IF p_sale_id IS NOT NULL THEN
  SELECT status INTO v_status FROM sales WHERE id=p_sale_id FOR UPDATE;
  IF v_status<>'CONFIRMED' THEN RAISE EXCEPTION 'Venda não confirmada'; END IF;
  IF EXISTS(SELECT 1 FROM closing_items WHERE sale_id=p_sale_id) THEN RAISE EXCEPTION 'Venda já incluída em fechamento'; END IF;
  SELECT GREATEST(0,st.net_total-COALESCE((SELECT sum(amount) FROM payments WHERE sale_id=p_sale_id AND status='CONFIRMED'),0))
    INTO v_due FROM v_sale_totals st WHERE st.sale_id=p_sale_id;
 ELSE
  PERFORM 1 FROM closings WHERE id=p_closing_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Fechamento inexistente'; END IF;
  SELECT GREATEST(0,COALESCE((SELECT sum(amount_considered) FROM closing_items WHERE closing_id=p_closing_id),0)
            -COALESCE((SELECT sum(amount) FROM payments WHERE closing_id=p_closing_id AND status='CONFIRMED'),0)) INTO v_due;
 END IF;
 IF v_due IS NULL OR p_amount>v_due THEN RAISE EXCEPTION 'Pagamento excede o saldo pendente (saldo=%)',v_due; END IF;
 INSERT INTO payments(sale_id,closing_id,actor_id,amount,method,idempotency_key)
 VALUES(p_sale_id,p_closing_id,p_actor_id,p_amount,p_method,p_idempotency_key)
 RETURNING id INTO v_id;
 RETURN v_id;
END $$;

CREATE FUNCTION record_refund(p_sale_id BIGINT,p_actor_id BIGINT,p_amount NUMERIC,p_reason TEXT)
RETURNS BIGINT LANGUAGE plpgsql SET search_path=peca_aqui,public AS $$
DECLARE v_id BIGINT;
BEGIN
 PERFORM set_config('app.actor_id',p_actor_id::TEXT,TRUE);
 IF p_amount IS NULL OR p_amount<=0 OR length(btrim(COALESCE(p_reason,'')))<3 THEN
   RAISE EXCEPTION 'Valor e motivo de reembolso são obrigatórios'; END IF;
 PERFORM 1 FROM sales WHERE id=p_sale_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Venda inexistente'; END IF;
 -- O valor deve ser conciliado pelo financeiro, inclusive quando houver fechamento.
 INSERT INTO refunds(sale_id,actor_id,amount,reason) VALUES(p_sale_id,p_actor_id,p_amount,p_reason)
 RETURNING id INTO v_id;
 RETURN v_id;
END $$;
COMMIT;
