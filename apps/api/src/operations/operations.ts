import { BadRequestException,Body,Controller,Get,Injectable,Module,Param,Post,Query,Req } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { Permissions } from '../auth/auth';
import { choice,dbError,itemsArray,numeric,pageLimit,payload,positiveId,requiredText } from '../common/validation';
@Injectable() class OperationsService {
 constructor(private readonly db:DbService){}
 purchases(){return this.db.q(`SELECT p.*,s.name AS supplier_name,u.name AS created_by_name FROM purchases p JOIN suppliers s ON s.id=p.supplier_id JOIN users u ON u.id=p.created_by ORDER BY p.id DESC LIMIT 100`)}
 purchaseDetails(id:unknown){return this.db.q('SELECT pi.*,pr.description,pr.internal_code FROM purchase_items pi JOIN products pr ON pr.id=pi.product_id WHERE pi.purchase_id=$1',[positiveId(id)]);}
 async createPurchase(input:unknown,actor:number){const d=payload(input);const items=itemsArray(d.items);
  try{return await this.db.tx(actor,async c=>{
   const order=await this.db.one(`INSERT INTO purchases(supplier_id,created_by,document_number,idempotency_key)
   VALUES($1,$2,$3,$4) RETURNING *`,[positiveId(d.supplier_id),actor,d.document_number??null,d.idempotency_key??null],c);
   for(const it of items)await this.db.one('INSERT INTO purchase_items(purchase_id,product_id,quantity,unit_cost) VALUES($1,$2,$3,$4) RETURNING id',
    [order!.id,positiveId(it.product_id),numeric(it.quantity,'Quantidade',{positive:true}),numeric(it.unit_cost,'Custo')],c);
   if(d.confirm!==false)await this.db.q('SELECT confirm_purchase($1,$2)',[order!.id,actor],c);
   return this.db.one('SELECT * FROM purchases WHERE id=$1',[order!.id],c);
  });}catch(e){dbError(e)} }
 async confirmPurchase(id:unknown,actor:number){try{return await this.db.tx(actor,async c=>{await this.db.q('SELECT confirm_purchase($1,$2)',[positiveId(id),actor],c);return this.db.one('SELECT * FROM purchases WHERE id=$1',[positiveId(id)],c);});}catch(e){dbError(e)} }
 stock(q=''){return this.db.q(`SELECT ps.*,p.brand_id,p.category_id,b.name AS brand FROM v_product_stock ps JOIN products p ON p.id=ps.product_id JOIN brands b ON b.id=p.brand_id WHERE ($1='' OR ps.description ILIKE $2 OR ps.internal_code ILIKE $2) ORDER BY ps.description LIMIT 250`,[q,`%${q}%`])}
 movements(productId?:string){return this.db.q(`SELECT m.*,p.internal_code,p.description,u.name AS actor_name FROM stock_movements m JOIN products p ON p.id=m.product_id JOIN users u ON u.id=m.actor_id WHERE ($1::bigint IS NULL OR m.product_id=$1) ORDER BY m.id DESC LIMIT 200`,[productId||null]);}
 async adjust(input:unknown,actor:number){const d=payload(input);
  try{return await this.db.tx(actor,async c=>{const prod=positiveId(d.product_id);const reason=requiredText(d.reason,'Motivo',500);
   const delta=await this.db.one('SELECT adjust_stock($1,$2,$3,$4) AS delta',[prod,numeric(d.new_quantity,'Quantidade'),actor,reason],c);
   const balance=await this.db.one('SELECT * FROM v_product_stock WHERE product_id=$1',[prod],c);return {...balance,delta:delta!.delta};});}catch(e){dbError(e)} }
 async sales(filters:Record<string,any>){const params=[`%${String(filters.q??'')}%`,filters.status||null,filters.customerId||null,Number(filters.limit??50)];
  return this.db.q(`SELECT s.* FROM v_sale_search s WHERE ($1='%%' OR s.sale_number ILIKE $1 OR s.customer_name ILIKE $1 OR COALESCE(s.notes,'') ILIKE $1 OR EXISTS (
    SELECT 1 FROM sale_items i JOIN products p ON p.id=i.product_id WHERE i.sale_id=s.sale_id AND (p.internal_code ILIKE $1 OR p.description ILIKE $1)))
  AND ($2::varchar IS NULL OR s.status=$2) AND ($3::bigint IS NULL OR s.customer_id=$3) ORDER BY s.sale_id DESC LIMIT $4`,[params[0],params[1],params[2],Math.max(1,Math.min(200,Number(params[3])||50))]); }
 async saleDetail(id:unknown){const sale=await this.db.one('SELECT * FROM v_sale_search WHERE sale_id=$1',[positiveId(id)]);
  if(!sale) throw new BadRequestException('Venda não encontrada');
  const items=await this.db.q(`SELECT si.*,p.internal_code,p.description,(SELECT COALESCE(sum(ri.quantity),0) FROM return_items ri JOIN returns r ON r.id=ri.return_id WHERE ri.sale_item_id=si.id AND r.status='CONFIRMED') AS returned_quantity FROM sale_items si JOIN products p ON p.id=si.product_id WHERE si.sale_id=$1`,[positiveId(id)]);
  const payments=await this.db.q('SELECT id,amount,method,paid_at,status FROM payments WHERE sale_id=$1 ORDER BY id',[positiveId(id)]);
  const returns=await this.db.q('SELECT * FROM returns WHERE sale_id=$1 ORDER BY id',[positiveId(id)]);
  return {...sale,items,payments,returns}; }
 async createSale(input:unknown,actor:number){const d=payload(input);const items=itemsArray(d.items);
  const customer=d.customer_id?positiveId(d.customer_id):null;
  const paymentTerms=choice(d.payment_terms??'IMMEDIATE','Forma de fechamento',['IMMEDIATE','DEFERRED'] as const);
  if(paymentTerms==='DEFERRED'&&!customer)throw new BadRequestException('Venda a prazo exige cliente cadastrado');
  const method=d.payment_method?choice(d.payment_method,'Forma de pagamento',['CASH','PIX','CARD','TRANSFER','OTHER'] as const):null;
  if(method && paymentTerms==='DEFERRED') throw new BadRequestException('Pagamento imediato e venda a prazo são excludentes');
  try{return await this.db.tx(actor,async c=>{
   const customerName=customer?(await this.db.one('SELECT name FROM customers WHERE id=$1 AND active',[customer],c))?.name:null;
   if(customer&&!customerName)throw new BadRequestException('Cliente indisponível');
   const sale=await this.db.one(`INSERT INTO sales(customer_id,customer_label,seller_id,notes,payment_terms,idempotency_key)
   VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,[customer,customerName??'AO CONSUMIDOR',actor,d.notes??null,paymentTerms,d.idempotency_key??null],c);
   for(const it of items) await this.db.q('INSERT INTO sale_items(sale_id,product_id,quantity,practiced_price) VALUES($1,$2,$3,$4)',
    [sale!.id,positiveId(it.product_id),numeric(it.quantity,'Quantidade',{positive:true}),numeric(it.practiced_price,'Preço')],c);
   await this.db.q('SELECT confirm_sale($1,$2)',[sale!.id,actor],c);
   if(method){const totals=await this.db.one('SELECT net_total FROM v_sale_totals WHERE sale_id=$1',[sale!.id],c);
    if(Number(totals?.net_total)>0)await this.db.q('SELECT register_payment($1,$2,$3,$4,NULL,$5)',[actor,totals!.net_total,method,sale!.id,`SALE-${sale!.id}-INITIAL`],c);
   }
   return this.db.one('SELECT * FROM v_sale_search WHERE sale_id=$1',[sale!.id],c);
  });}catch(e){dbError(e)} }
 async returnSale(saleId:unknown,input:unknown,actor:number){const d=payload(input);const items=itemsArray(d.items);try{return await this.db.tx(actor,async c=>{
  const ret=await this.db.one('INSERT INTO returns(sale_id,actor_id,reason) VALUES($1,$2,$3) RETURNING *',[positiveId(saleId),actor,requiredText(d.reason,'Motivo')],c);
  for(const it of items) await this.db.q('INSERT INTO return_items(return_id,sale_item_id,quantity) VALUES($1,$2,$3)',[ret!.id,positiveId(it.sale_item_id),numeric(it.quantity,'Quantidade',{positive:true})],c);
  await this.db.q('SELECT confirm_return($1,$2)',[ret!.id,actor],c);
  return this.db.one('SELECT * FROM returns WHERE id=$1',[ret!.id],c);
 });}catch(e){dbError(e)} }
 async cancelSale(id:unknown,input:unknown,actor:number){const d=payload(input);try{return await this.db.tx(actor,async c=>{
  await this.db.q('SELECT cancel_sale($1,$2,$3)',[positiveId(id),actor,requiredText(d.reason,'Motivo')],c);
  return this.db.one('SELECT * FROM v_sale_search WHERE sale_id=$1',[positiveId(id)],c);
 });}catch(e){dbError(e)} }
}
@Controller() class OperationsController {
 constructor(private readonly svc:OperationsService){}
 @Get(['purchases','compras']) purchases(){return this.svc.purchases()}
 @Get(['purchases/:id/items','compras/:id/items']) purchaseItems(@Param('id') id:string){return this.svc.purchaseDetails(id)}
 @Permissions('PURCHASE_CONFIRM') @Post(['purchases','compras']) purchase(@Body() b:unknown,@Req() r:any){return this.svc.createPurchase(b,r.actor.id)}
 @Permissions('PURCHASE_CONFIRM') @Post(['purchases/:id/confirm','compras/:id/confirm']) confirm(@Param('id') id:string,@Req() r:any){return this.svc.confirmPurchase(id,r.actor.id)}
 @Get(['stock','estoque']) stock(@Query('q') q?:string){return this.svc.stock(q)}
 @Get(['stock/movements','estoque/movements']) movements(@Query('productId') p?:string){return this.svc.movements(p)}
 @Permissions('STOCK_ADJUST') @Post(['stock/adjustments','estoque/adjustments']) adjust(@Body() b:unknown,@Req() r:any){return this.svc.adjust(b,r.actor.id)}
 @Get(['sales','vendas']) sales(@Query() q:Record<string,any>){return this.svc.sales(q)}
 @Get(['sales/:id','vendas/:id']) sale(@Param('id') id:string){return this.svc.saleDetail(id)}
 @Permissions('SALE_CONFIRM') @Post(['sales','vendas']) createSale(@Body() b:unknown,@Req() r:any){return this.svc.createSale(b,r.actor.id)}
 @Permissions('SALE_RETURN') @Post(['sales/:id/returns','vendas/:id/returns']) ret(@Param('id') id:string,@Body() b:unknown,@Req() r:any){return this.svc.returnSale(id,b,r.actor.id)}
 @Permissions('SALE_CANCEL') @Post(['sales/:id/cancel','vendas/:id/cancel']) cancel(@Param('id') id:string,@Body() b:unknown,@Req() r:any){return this.svc.cancelSale(id,b,r.actor.id)}
}
@Module({controllers:[OperationsController],providers:[OperationsService]}) export class OperationsModule {}
