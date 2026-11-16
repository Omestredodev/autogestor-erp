-- PEÇA-AQUI | Patch corretivo 001 | Aplicação segura sobre um banco já criado
-- Corrige tentativa de INSERT de saldo negativo em movimentos de saída.
-- Não remove registros, tabelas nem dados preexistentes.
BEGIN;
SET search_path TO peca_aqui, public;
CREATE OR REPLACE FUNCTION apply_stock_movement() RETURNS TRIGGER LANGUAGE plpgsql SET search_path=peca_aqui,public AS $$
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
COMMIT;
