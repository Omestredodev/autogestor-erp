\set ON_ERROR_STOP on
SET search_path TO peca_aqui,public;
DO $$
BEGIN
 IF (SELECT count(*) FROM products)=0 OR (SELECT count(*) FROM users)=0 THEN
   RAISE EXCEPTION 'Dados de demonstração ausentes; aplique database/patches/001_fix_stock_movement.sql e execute database/init/04_seed.sql';
 END IF;
END $$;
SELECT 'tabelas' AS categoria,count(*) AS quantidade FROM information_schema.tables
 WHERE table_schema='peca_aqui' AND table_type='BASE TABLE'
UNION ALL
SELECT 'views',count(*) FROM information_schema.views WHERE table_schema='peca_aqui'
UNION ALL
SELECT 'produtos',count(*) FROM products
UNION ALL
SELECT 'usuários demo',count(*) FROM users
UNION ALL
SELECT 'movimentações',count(*) FROM stock_movements
ORDER BY categoria;
SELECT product_id,internal_code,description,on_hand,stock_status FROM v_product_stock ORDER BY product_id;
SELECT sale_number,status,gross_total,returned_total,net_total FROM v_sale_totals ORDER BY sale_id;
SELECT * FROM v_dashboard_summary;
