-- PEÇA-AQUI | V003 | Consultas oficiais para a API
BEGIN;
SET search_path TO peca_aqui,public;
CREATE VIEW v_product_stock AS
 SELECT p.id AS product_id,p.internal_code,p.description,p.active,p.current_cost,p.manual_margin,
        p.standard_price,suggested_price(p.current_cost,p.manual_margin) AS suggested_price,
        COALESCE(b.quantity,0)::NUMERIC(14,3) AS on_hand,p.min_stock,p.max_stock,p.stock_location,
        CASE WHEN COALESCE(b.quantity,0)=0 THEN 'OUT_OF_STOCK'
             WHEN COALESCE(b.quantity,0)<=p.min_stock THEN 'LOW' ELSE 'OK' END AS stock_status
 FROM products p LEFT JOIN stock_balances b ON b.product_id=p.id;

CREATE VIEW v_equivalences_bidirectional AS
 SELECT e.id AS equivalence_id,e.product_a_id AS product_id,e.product_b_id AS equivalent_product_id,e.active,e.notes
 FROM product_equivalences e
 UNION ALL
 SELECT e.id,e.product_b_id,e.product_a_id,e.active,e.notes FROM product_equivalences e;

CREATE VIEW v_sale_totals AS
 WITH sold AS (
   SELECT sale_id,round(sum(quantity*practiced_price),2) AS gross_total
   FROM sale_items GROUP BY sale_id
 ), returned AS (
   SELECT r.sale_id,round(sum(ri.quantity*si.practiced_price),2) AS returned_total
   FROM returns r JOIN return_items ri ON ri.return_id=r.id
     JOIN sale_items si ON si.id=ri.sale_item_id
   WHERE r.status='CONFIRMED' GROUP BY r.sale_id
 )
 SELECT s.id AS sale_id,s.sale_number,s.customer_id,s.customer_label,s.seller_id,
   s.payment_terms,s.status,s.created_at,s.confirmed_at,
   COALESCE(sold.gross_total,0)::NUMERIC(14,2) AS gross_total,
   COALESCE(returned.returned_total,0)::NUMERIC(14,2) AS returned_total,
   CASE WHEN s.status='CANCELLED' THEN 0::NUMERIC(14,2)
        ELSE GREATEST(0,COALESCE(sold.gross_total,0)-COALESCE(returned.returned_total,0))::NUMERIC(14,2)
   END AS net_total
 FROM sales s LEFT JOIN sold ON sold.sale_id=s.id
 LEFT JOIN returned ON returned.sale_id=s.id;

CREATE VIEW v_sale_search AS
 SELECT t.*,s.notes,COALESCE(c.name,'AO CONSUMIDOR') AS customer_name,u.name AS seller_name
 FROM v_sale_totals t JOIN sales s ON s.id=t.sale_id
 LEFT JOIN customers c ON c.id=t.customer_id JOIN users u ON u.id=t.seller_id;

CREATE VIEW v_closing_balances AS
 SELECT c.id AS closing_id,c.customer_id,c.period_start,c.period_end,
  COALESCE((SELECT sum(ci.amount_considered) FROM closing_items ci WHERE ci.closing_id=c.id),0)::NUMERIC(14,2) AS total,
  COALESCE((SELECT sum(p.amount) FROM payments p WHERE p.closing_id=c.id AND p.status='CONFIRMED'),0)::NUMERIC(14,2) AS received,
  GREATEST(0,
   COALESCE((SELECT sum(ci.amount_considered) FROM closing_items ci WHERE ci.closing_id=c.id),0)
   -COALESCE((SELECT sum(p.amount) FROM payments p WHERE p.closing_id=c.id AND p.status='CONFIRMED'),0))::NUMERIC(14,2) AS due,
  CASE WHEN COALESCE((SELECT sum(p.amount) FROM payments p WHERE p.closing_id=c.id AND p.status='CONFIRMED'),0) >=
            COALESCE((SELECT sum(ci.amount_considered) FROM closing_items ci WHERE ci.closing_id=c.id),0) THEN 'PAID'
       WHEN EXISTS (SELECT 1 FROM payments p WHERE p.closing_id=c.id AND p.status='CONFIRMED') THEN 'PARTIAL'
       ELSE 'OPEN' END AS payment_status
 FROM closings c;

CREATE VIEW v_accounts_receivable AS
 SELECT 'SALE'::TEXT AS source_type,t.sale_id AS source_id,t.customer_id,
   GREATEST(0,t.net_total-COALESCE((SELECT sum(p.amount) FROM payments p WHERE p.sale_id=t.sale_id AND p.status='CONFIRMED'),0))::NUMERIC(14,2) AS due
 FROM v_sale_totals t WHERE t.status='CONFIRMED' AND t.customer_id IS NOT NULL
 AND NOT EXISTS(SELECT 1 FROM closing_items ci WHERE ci.sale_id=t.sale_id)
 UNION ALL
 SELECT 'CLOSING',c.closing_id,c.customer_id,c.due FROM v_closing_balances c;

CREATE VIEW v_customer_balances AS
 SELECT c.id AS customer_id,c.name,COALESCE(sum(a.due),0)::NUMERIC(14,2) AS amount_due
 FROM customers c LEFT JOIN v_accounts_receivable a ON a.customer_id=c.id
 GROUP BY c.id,c.name;

CREATE VIEW v_dashboard_summary AS
 SELECT
 (SELECT COALESCE(sum(t.net_total),0) FROM v_sale_totals t WHERE t.status='CONFIRMED' AND t.confirmed_at::DATE=CURRENT_DATE)::NUMERIC(14,2) AS revenue_today,
 (SELECT COALESCE(sum(t.net_total),0) FROM v_sale_totals t WHERE t.status='CONFIRMED'
   AND date_trunc('month',t.confirmed_at)=date_trunc('month',CURRENT_TIMESTAMP))::NUMERIC(14,2) AS revenue_month,
 (SELECT count(*) FROM sales WHERE status='CONFIRMED')::BIGINT AS confirmed_sales,
 (SELECT count(*) FROM v_product_stock WHERE active AND stock_status IN ('LOW','OUT_OF_STOCK'))::BIGINT AS low_stock_products,
 (SELECT COALESCE(sum(due),0) FROM v_accounts_receivable)::NUMERIC(14,2) AS accounts_receivable,
 (SELECT count(*) FROM v_closing_balances WHERE due>0)::BIGINT AS pending_closings,
 (SELECT count(*) FROM reminders WHERE status IN ('PENDING','SNOOZED') AND scheduled_for::DATE=CURRENT_DATE)::BIGINT AS reminders_today;
COMMIT;
