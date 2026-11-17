import { BadRequestException,Body,Controller,Get,Injectable,Module,Param,Patch,Post,Query,Req } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { Permissions } from '../auth/auth';
import { choice,dbError,payload,positiveId,requiredText } from '../common/validation';
@Injectable() class RemindersService {
 constructor(private readonly db:DbService){}
 list(actor:number){return this.db.q(`SELECT DISTINCT r.* FROM reminders r LEFT JOIN reminder_recipients d ON d.reminder_id=r.id WHERE r.created_by=$1 OR d.user_id=$1 ORDER BY r.scheduled_for LIMIT 200`,[actor]);}
 async create(input:unknown,actor:number){const d=payload(input);const when=new Date(String(d.scheduled_for??''));if(Number.isNaN(when.getTime()))throw new BadRequestException('Data e horário inválidos');
  try{return await this.db.tx(actor,async c=>{
   const r=await this.db.one(`INSERT INTO reminders(created_by,title,description,scheduled_for,customer_id,product_id,sale_id)
   VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,[actor,requiredText(d.title,'Título'),d.description??null,when.toISOString(),d.customer_id?positiveId(d.customer_id):null,d.product_id?positiveId(d.product_id):null,d.sale_id?positiveId(d.sale_id):null],c);
   const targets=Array.isArray(d.recipient_ids)?d.recipient_ids.map(positiveId):[actor];
   for(const id of new Set(targets)){await this.db.q('INSERT INTO reminder_recipients(reminder_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[r!.id,id],c)}
   return r;
  });}catch(e){dbError(e)} }
 async action(id:unknown,input:unknown,actor:number){const d=payload(input);const status=choice(d.action,'Ação',['DONE','CANCELLED','SNOOZED'] as const);
  let date:string|null=null;
  if(status==='SNOOZED'){const mins=Number(d.minutes??30);if(![30,60].includes(mins))throw new BadRequestException('Adie por 30 ou 60 minutos');date=new Date(Date.now()+mins*60000).toISOString();}
  try{return await this.db.tx(actor,async c=>{const check=await this.db.one(`SELECT id,status FROM reminders WHERE id=$1 AND
   (created_by=$2 OR EXISTS(SELECT 1 FROM reminder_recipients WHERE reminder_id=$1 AND user_id=$2)) FOR UPDATE`,[positiveId(id),actor],c);
   if(!check)throw new BadRequestException('Lembrete não encontrado');if(['DONE','CANCELLED'].includes(check.status))throw new BadRequestException('Lembrete já encerrado');
   return this.db.one(`UPDATE reminders SET status=$1,scheduled_for=COALESCE($2::timestamptz,scheduled_for),resolved_at=CASE WHEN $1='SNOOZED' THEN NULL ELSE now() END WHERE id=$3 RETURNING *`,[status,date,positiveId(id)],c);
  });}catch(e){dbError(e)} }
}
@Controller(['reminders','lembretes']) class RemindersController {
 constructor(private readonly svc:RemindersService){}
 @Permissions('REMINDER_MANAGE') @Get() all(@Req() r:any){return this.svc.list(r.actor.id)}
 @Permissions('REMINDER_MANAGE') @Post() create(@Body() b:unknown,@Req() r:any){return this.svc.create(b,r.actor.id)}
 @Permissions('REMINDER_MANAGE') @Patch(':id/action') action(@Param('id') id:string,@Body() b:unknown,@Req() r:any){return this.svc.action(id,b,r.actor.id)}
}
@Module({controllers:[RemindersController],providers:[RemindersService]}) export class RemindersModule {}
