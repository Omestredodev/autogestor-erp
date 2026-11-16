-- PEÇA-AQUI | Dados sintéticos determinísticos (somente ambiente de estudo)
BEGIN;
SET search_path TO peca_aqui,public;
INSERT INTO profiles(name) VALUES ('ADMIN'),('SELLER'),('STOCK'),('FINANCE');
INSERT INTO permissions(code,description) VALUES
('PRODUCT_READ','Consultar produtos'),('PRODUCT_WRITE','Gerenciar produtos'),
('PURCHASE_CONFIRM','Confirmar compras'),('STOCK_ADJUST','Ajustar estoque'),
('SALE_CONFIRM','Confirmar vendas'),('SALE_RETURN','Registrar devoluções'),
('SALE_CANCEL','Cancelar vendas'),('FINANCE_MANAGE','Recebimentos e fechamentos'),
('REMINDER_MANAGE','Gerenciar lembretes'),('AUDIT_READ','Consultar auditoria');
INSERT INTO profile_permissions(profile_id,permission_id,allowed)
 SELECT p.id,perm.id,TRUE FROM profiles p CROSS JOIN permissions perm WHERE p.name='ADMIN';
INSERT INTO profile_permissions(profile_id,permission_id)
 SELECT p.id,perm.id FROM profiles p JOIN permissions perm ON
  (p.name='SELLER' AND perm.code IN ('PRODUCT_READ','SALE_CONFIRM','SALE_RETURN','REMINDER_MANAGE'))
  OR (p.name='STOCK' AND perm.code IN ('PRODUCT_READ','PRODUCT_WRITE','PURCHASE_CONFIRM','STOCK_ADJUST'))
  OR (p.name='FINANCE' AND perm.code IN ('PRODUCT_READ','FINANCE_MANAGE','AUDIT_READ'));
-- Usuários de demonstração SEM senha cadastrada; login real depende de configuração posterior do backend.
INSERT INTO users(profile_id,name,email) VALUES
((SELECT id FROM profiles WHERE name='ADMIN'),'Administrador Demo','admin@demo.invalid'),
((SELECT id FROM profiles WHERE name='SELLER'),'Vendedor Demo','vendedor@demo.invalid'),
((SELECT id FROM profiles WHERE name='STOCK'),'Estoquista Demo','estoque@demo.invalid'),
((SELECT id FROM profiles WHERE name='FINANCE'),'Financeiro Demo','financeiro@demo.invalid');
INSERT INTO brands(name) VALUES ('Bosch'),('Mann-Filter'),('NGK'),('Cobreq'),('Valeo');
INSERT INTO categories(name) VALUES ('Filtros'),('Ignição'),('Freios'),('Elétrica');
INSERT INTO units(symbol,description) VALUES ('UN','Unidade'),('JG','Jogo'),('PAR','Par');
INSERT INTO products(internal_code,manufacturer_code,description,brand_id,category_id,unit_id,current_cost,manual_margin,standard_price,min_stock,max_stock,stock_location)
 VALUES
 ('PA-FILT-001','B-FA101','Filtro de ar demonstrativo',
  (SELECT id FROM brands WHERE name='Bosch'),(SELECT id FROM categories WHERE name='Filtros'),
  (SELECT id FROM units WHERE symbol='UN'),35,0.40,58.33,5,100,'A-01'),
 ('PA-FILT-002','MF-FA201','Filtro de ar equivalente demonstrativo',
  (SELECT id FROM brands WHERE name='Mann-Filter'),(SELECT id FROM categories WHERE name='Filtros'),
  (SELECT id FROM units WHERE symbol='UN'),30,0.35,46.15,5,100,'A-02'),
 ('PA-IGN-003','NGK-V100','Vela de ignição demonstrativa',
  (SELECT id FROM brands WHERE name='NGK'),(SELECT id FROM categories WHERE name='Ignição'),
  (SELECT id FROM units WHERE symbol='UN'),18,0.45,32.73,8,100,'B-01'),
 ('PA-BRK-004','CB-PAD10','Pastilha de freio demonstrativa',
  (SELECT id FROM brands WHERE name='Cobreq'),(SELECT id FROM categories WHERE name='Freios'),
  (SELECT id FROM units WHERE symbol='JG'),92,0.35,141.54,3,40,'C-01'),
 ('PA-ELT-005','VAL-ALT','Componente elétrico demonstrativo',
  (SELECT id FROM brands WHERE name='Valeo'),(SELECT id FROM categories WHERE name='Elétrica'),
  (SELECT id FROM units WHERE symbol='UN'),120,0.30,171.43,2,30,'D-01');
INSERT INTO vehicles(manufacturer,model,year_start,year_end,engine,version) VALUES
('Volkswagen','Gol',2015,2018,'1.0','Exemplo'),
('Fiat','Palio',2012,2016,'1.4','Exemplo'),
('Chevrolet','Onix',2017,2020,'1.0','Exemplo');
-- APLICAÇÕES são apenas ilustrativas, não representam catálogo de compatibilidade verificado.
INSERT INTO product_applications(product_id,vehicle_id,notes) VALUES
((SELECT id FROM products WHERE internal_code='PA-FILT-001'),(SELECT id FROM vehicles WHERE model='Gol'),'Demonstração — não usar como referência técnica'),
((SELECT id FROM products WHERE internal_code='PA-FILT-002'),(SELECT id FROM vehicles WHERE model='Gol'),'Demonstração — não usar como referência técnica');
INSERT INTO product_equivalences(product_a_id,product_b_id,notes,created_by)
 SELECT LEAST(p1.id,p2.id),GREATEST(p1.id,p2.id),'Equivalência fictícia para testes',(SELECT id FROM users WHERE email='admin@demo.invalid')
 FROM products p1 CROSS JOIN products p2 WHERE p1.internal_code='PA-FILT-001' AND p2.internal_code='PA-FILT-002';
INSERT INTO customers(name,document,payment_terms,credit_limit) VALUES
('Oficina Horizonte (fictícia)','00000000001','WEEKLY',20000),
('Cliente Balcão (fictício)','00000000002','IMMEDIATE',NULL);
INSERT INTO suppliers(name,document,phone) VALUES
('Distribuidora Alpha (fictícia)','00000000000100','(11) 0000-0000'),
('Peças Brasil Atacado (fictícia)','00000000000200','(11) 0000-0001');

-- Todo estoque inicial nasce de movimentação rastreável, e não de UPDATE direto de saldo.
SELECT adjust_stock(id,CASE internal_code
    WHEN 'PA-FILT-001' THEN 24 WHEN 'PA-FILT-002' THEN 18 WHEN 'PA-IGN-003' THEN 40
    WHEN 'PA-BRK-004' THEN 10 ELSE 5 END,
    (SELECT id FROM users WHERE email='estoque@demo.invalid'),'Inventário inicial fictício')
FROM products ORDER BY id;

-- Compra de demonstração confirmada: cria entrada e atualiza custo, sem alterar preço padrão.
INSERT INTO purchases(supplier_id,created_by,document_number)
VALUES ((SELECT id FROM suppliers WHERE name='Distribuidora Alpha (fictícia)'),
        (SELECT id FROM users WHERE email='estoque@demo.invalid'),'NFE-EXEMPLO-001');
INSERT INTO purchase_items(purchase_id,product_id,quantity,unit_cost)
VALUES ((SELECT id FROM purchases WHERE document_number='NFE-EXEMPLO-001'),
        (SELECT id FROM products WHERE internal_code='PA-FILT-001'),10,36.00);
SELECT confirm_purchase((SELECT id FROM purchases WHERE document_number='NFE-EXEMPLO-001'),
 (SELECT id FROM users WHERE email='estoque@demo.invalid'));

-- Venda demonstrativa paga à vista.
INSERT INTO sales(customer_id,customer_label,seller_id,notes,payment_terms)
VALUES ((SELECT id FROM customers WHERE document='00000000002'),'Cliente Balcão (fictício)',
  (SELECT id FROM users WHERE email='vendedor@demo.invalid'),'Venda de teste','IMMEDIATE');
INSERT INTO sale_items(sale_id,product_id,quantity,practiced_price)
VALUES ((SELECT id FROM sales WHERE notes='Venda de teste'),
        (SELECT id FROM products WHERE internal_code='PA-FILT-001'),2,59.90);
SELECT confirm_sale((SELECT id FROM sales WHERE notes='Venda de teste'),
 (SELECT id FROM users WHERE email='vendedor@demo.invalid'));
SELECT register_payment((SELECT id FROM users WHERE email='financeiro@demo.invalid'),119.80,'PIX',
 (SELECT id FROM sales WHERE notes='Venda de teste'),NULL,'DEMO-PAYMENT-1');

-- Vendas a prazo demonstrativas (ainda não incluídas em fechamento).
INSERT INTO sales(customer_id,customer_label,seller_id,notes,payment_terms)
VALUES
 ((SELECT id FROM customers WHERE document='00000000001'),'Oficina Horizonte (fictícia)',(SELECT id FROM users WHERE email='vendedor@demo.invalid'),'Ordem semanal A','DEFERRED'),
 ((SELECT id FROM customers WHERE document='00000000001'),'Oficina Horizonte (fictícia)',(SELECT id FROM users WHERE email='vendedor@demo.invalid'),'Ordem semanal B','DEFERRED');
INSERT INTO sale_items(sale_id,product_id,quantity,practiced_price)
VALUES ((SELECT id FROM sales WHERE notes='Ordem semanal A'),(SELECT id FROM products WHERE internal_code='PA-IGN-003'),3,33.00),
       ((SELECT id FROM sales WHERE notes='Ordem semanal B'),(SELECT id FROM products WHERE internal_code='PA-BRK-004'),1,145.00);
SELECT confirm_sale((SELECT id FROM sales WHERE notes='Ordem semanal A'),
 (SELECT id FROM users WHERE email='vendedor@demo.invalid'));
SELECT confirm_sale((SELECT id FROM sales WHERE notes='Ordem semanal B'),
 (SELECT id FROM users WHERE email='vendedor@demo.invalid'));

INSERT INTO reminders(created_by,title,description,scheduled_for,customer_id)
VALUES ((SELECT id FROM users WHERE email='vendedor@demo.invalid'),
 'Acompanhar encomenda da Oficina Horizonte','Ligar para confirmar a retirada de peça de exemplo',
 now()+INTERVAL '1 day',(SELECT id FROM customers WHERE document='00000000001'));
INSERT INTO reminder_recipients(reminder_id,user_id)
VALUES ((SELECT id FROM reminders WHERE title='Acompanhar encomenda da Oficina Horizonte'),
        (SELECT id FROM users WHERE email='vendedor@demo.invalid'));
COMMIT;
