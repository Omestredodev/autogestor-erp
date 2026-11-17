import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { dbError, payload, positiveId } from './validation';
type Spec={table:string; cols:string[]; required?:string[]};
export const SPEC:Record<string,Spec>={
 products:{table:'products',cols:['internal_code','manufacturer_code','ean','oem_code','description','brand_id','category_id','unit_id','current_cost','manual_margin','standard_price','min_stock','max_stock','stock_location','active'],required:['internal_code','description','brand_id','category_id','unit_id']},
 customers:{table:'customers',cols:['name','document','phone','email','address','payment_terms','credit_limit','active'],required:['name']},
 suppliers:{table:'suppliers',cols:['name','document','phone','email','address','active'],required:['name']},
 vehicles:{table:'vehicles',cols:['manufacturer','model','year_start','year_end','engine','version','vehicle_type','notes'],required:['manufacturer','model','year_start','year_end']}
};
@Injectable() export class CrudService {
 constructor(private db:DbService){}
 async list(entity:string, search='', limit=50){
  const spec=SPEC[entity]; if(!spec) throw new BadRequestException('Entidade desconhecida');
  const nameCol=entity==='products'?"internal_code || ' ' || description":entity==='vehicles'?"manufacturer || ' ' || model":'name';
  const clause=search?' WHERE ('+nameCol+') ILIKE $1':'';
  const params=search?[`%${search}%`,limit]:[limit];
  const rows=await this.db.q(`SELECT * FROM ${spec.table}${clause} ORDER BY id DESC LIMIT $${params.length}`,params);
  return rows;
 }
 async find(entity:string,id:unknown){ const table=SPEC[entity]?.table; if(!table) throw new BadRequestException('Entidade desconhecida');
  const row=await this.db.one(`SELECT * FROM ${table} WHERE id=$1`,[positiveId(id)]); if(!row) throw new NotFoundException('Registro não encontrado'); return row; }
 async create(entity:string, input:unknown, actor:number){return this.save(entity,input,actor);}
 async update(entity:string,id:unknown,input:unknown,actor:number){return this.save(entity,input,actor,positiveId(id));}
 private async save(entity:string,input:unknown,actor:number,id?:number){
  const spec=SPEC[entity]; if(!spec) throw new BadRequestException('Entidade desconhecida');
  const data=payload(input);
  const keys=Object.keys(data).filter(k=>spec.cols.includes(k));
  const forbidden=Object.keys(data).filter(k=>!spec.cols.includes(k)); if(forbidden.length) throw new BadRequestException('Campos não permitidos: '+forbidden.join(', '));
  if(!id){for(const k of spec.required??[]){if(data[k]===undefined || data[k]===null ||data[k]==='') throw new BadRequestException(`Campo obrigatório: ${k}`);}}
  if(!keys.length) throw new BadRequestException('Nenhum campo informado');
  if(entity==='products'){
   for(const k of ['current_cost','standard_price','min_stock','max_stock']) if(data[k]!=null && (!Number.isFinite(Number(data[k]))||Number(data[k])<0)) throw new BadRequestException(`${k} inválido`);
   if(data.manual_margin!=null&&(!Number.isFinite(Number(data.manual_margin))||Number(data.manual_margin)<0||Number(data.manual_margin)>=1)) throw new BadRequestException('Margem deve estar entre 0 e 0,9999');
  }
  return this.db.tx(actor, async client=>{
   try {
    const values=keys.map(k=>data[k]); let row:any;
    if(id){const set=keys.map((k,i)=>`"${k}"=$${i+1}`).join(',');
      row=await this.db.one(`UPDATE ${spec.table} SET ${set}${entity==='products'?',updated_at=now()':''} WHERE id=$${keys.length+1} RETURNING *`,[...values,id],client);
    } else {
      row=await this.db.one(`INSERT INTO ${spec.table} (${keys.map(k=>'"'+k+'"').join(',')}) VALUES (${keys.map((_,i)=>'$'+(i+1)).join(',')}) RETURNING *`,values,client);
    }
    if(!row) throw new NotFoundException('Registro não encontrado'); return row;
   }catch(e){dbError(e);}
  });
 }
}
