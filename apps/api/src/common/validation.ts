import { BadRequestException } from '@nestjs/common';
export function payload(input: unknown): Record<string,any> {
 if(!input || typeof input!=='object' || Array.isArray(input)) throw new BadRequestException('Corpo JSON inválido');
 return input as Record<string,any>;
}
export function positiveId(x: unknown): number { const n=Number(x); if(!Number.isSafeInteger(n)||n<1) throw new BadRequestException('ID inválido'); return n; }
export function numeric(x: unknown, field:string, {min=0,positive=false,max=1e12} = {}): number {
 const n=Number(x); if(x===null||x===undefined||x===''||!Number.isFinite(n)||n<min||(positive&&n<=0)||n>max) throw new BadRequestException(`${field} inválido`);
 return n;
}
export function requiredText(x:unknown, field:string, max=200):string {
 if(typeof x!=='string'||!x.trim()||x.length>max) throw new BadRequestException(`${field} obrigatório (até ${max} caracteres)`);
 return x.trim();
}
export function choice<T extends string>(x:unknown, field:string, options:readonly T[]):T {
 if(!options.includes(x as T)) throw new BadRequestException(`${field} inválido`);
 return x as T;
}
export function itemsArray(x:unknown):Record<string,any>[] {if(!Array.isArray(x)||!x.length||x.length>100) throw new BadRequestException('Informe de 1 a 100 itens'); return x.map(payload);}
export function validDate(s: unknown): string { if(typeof s!=='string'|| !/^\d{4}-\d{2}-\d{2}$/.test(s) || Number.isNaN(Date.parse(s))) throw new BadRequestException('Data no formato AAAA-MM-DD'); return s; }
export function pageLimit(x:unknown):number {const n=Number(x??50);return Number.isInteger(n)?Math.max(1,Math.min(100,n)):50;}
export function dbError(e:any):never {
 if(e?.code==='23505') throw new BadRequestException('Registro duplicado ou já vinculado');
 if(e?.code==='23503') throw new BadRequestException('Registro vinculado não encontrado');
 if(e?.code==='23514'||e?.code==='23502'||e?.code==='22P02') throw new BadRequestException('Dados não atendem às regras do banco');
 if(e?.code==='P0001') throw new BadRequestException(e.message || 'Regra de negócio não atendida');
 throw e;
}
