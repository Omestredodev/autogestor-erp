import { Body,Controller,Get,Injectable,Module,Param,Post,Query,Req } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { Permissions } from '../auth/auth';
import { choice,dbError,itemsArray,numeric,payload,positiveId,requiredText,validDate } from '../common/validation';
@Injectable() class FinanceService {
 constructor(private readonly db:DbService){}
 receivables(){return this.db.q(`SELECT a.*,c.name AS customer_name FROM v_accounts_receivable a JOIN customers c ON c.id=a.customer_id WHERE a.due>0 ORDER BY a.source_type,a.source_id LIMIT 250`)}
 balances(){return this.db.q('SELECT * FROM v_customer_balances ORDER BY name LIMIT 200')}
 closings(){return this.db.q(`SELECT c.*,b.total,b.received,b.due,b.payment_status,u.name AS customer_name
 FROM closings c JOIN v_closing_balances b ON b.closing_id=c.id JOIN customers u ON u.id=c.customer_id ORDER BY c.id DESC LIMIT 150`)}
 closing(id:unknown){return this.db.q(`SELECT ci.*,s.sale_number FROM closing_items ci JOIN sales s ON s.id=ci.sale_id WHERE ci.closing_id=$1`,[positiveId(id)])}
 payments(){return this.db.q('SELECT * FROM payments ORDER BY id DESC LIMIT 200')}
 refunds(){return this.db.q('SELECT * FROM refunds ORDER BY id DESC LIMIT 150')}
 async createClosing(input:unknown,actor:number){const d=payload(input);const ids=itemsArray(d.sales).map(x=>positiveId(x.id));
  try{return await this.db.tx(actor,async c=>{
   const result=await this.db.one('SELECT create_closing($1,$2,$3::date,$4::date,$5::bigint[]) AS id',[
    positiveId(d.customer_id),actor,validDate(d.period_start),validDate(d.period_end),ids],c);
   return this.db.one('SELECT * FROM v_closing_balances WHERE closing_id=$1',[result!.id],c);
  });}catch(e){dbError(e)} }
 async registerPayment(input:unknown,actor:number){const d=payload(input);const sale=d.sale_id?positiveId(d.sale_id):null;
  const closing=d.closing_id?positiveId(d.closing_id):null;const method=choice(d.method,'Forma de pagamento',['CASH','PIX','CARD','TRANSFER','OTHER'] as const);
  try{return await this.db.tx(actor,async c=>{
   const result=await this.db.one('SELECT register_payment($1,$2,$3,$4,$5,$6) AS id',[
    actor,numeric(d.amount,'Valor',{positive:true}),method,sale,closing,d.idempotency_key??null],c);
   return this.db.one('SELECT * FROM payments WHERE id=$1',[result!.id],c);
  });}catch(e){dbError(e)} }
 async refund(input:unknown,actor:number){const d=payload(input);
  try{return await this.db.tx(actor,async c=>{
   const result=await this.db.one('SELECT record_refund($1,$2,$3,$4) AS id',[
    positiveId(d.sale_id),actor,numeric(d.amount,'Valor',{positive:true}),requiredText(d.reason,'Motivo')],c);
   return this.db.one('SELECT * FROM refunds WHERE id=$1',[result!.id],c);
  });}catch(e){dbError(e)} }
}
@Controller() class FinanceController {
 constructor(private readonly svc:FinanceService){}
 @Permissions('FINANCE_MANAGE') @Get(['receivables','contas-a-receber']) receivables(){return this.svc.receivables()}
 @Permissions('FINANCE_MANAGE') @Get('customer-balances') balances(){return this.svc.balances()}
 @Permissions('FINANCE_MANAGE') @Get(['closings','fechamentos']) closings(){return this.svc.closings()}
 @Permissions('FINANCE_MANAGE') @Get(['closings/:id/items','fechamentos/:id/items']) items(@Param('id') id:string){return this.svc.closing(id)}
 @Permissions('FINANCE_MANAGE') @Post(['closings','fechamentos']) closing(@Body() b:unknown,@Req() r:any){return this.svc.createClosing(b,r.actor.id)}
 @Permissions('FINANCE_MANAGE') @Get(['payments','pagamentos']) payments(){return this.svc.payments()}
 @Permissions('FINANCE_MANAGE') @Post(['payments','pagamentos']) pay(@Body() b:unknown,@Req() r:any){return this.svc.registerPayment(b,r.actor.id)}
 @Permissions('FINANCE_MANAGE') @Get(['refunds','reembolsos']) refunds(){return this.svc.refunds()}
 @Permissions('FINANCE_MANAGE') @Post(['refunds','reembolsos']) refund(@Body() b:unknown,@Req() r:any){return this.svc.refund(b,r.actor.id)}
}
@Module({controllers:[FinanceController],providers:[FinanceService]}) export class FinanceModule {}
