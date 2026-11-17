export type Row = Record<string,any>;
export type User={id:number;name:string;email:string;profile:string;permissions:string[];mustChangePassword:boolean};
export type HttpMethod='GET'|'POST'|'PATCH'|'DELETE';
export type Page='dashboard'|'products'|'applications'|'equivalences'|'customers'|'suppliers'|'vehicles'|'purchases'|'inventory'|'sales'|'closings'|'finance'|'reminders'|'audit'|'admin'|'account';
export const money=(v:unknown)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v??0));
export const date=(v:unknown)=>v?new Date(String(v)).toLocaleString('pt-BR'):'—';
