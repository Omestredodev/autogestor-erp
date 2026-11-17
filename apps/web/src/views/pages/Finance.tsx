import React,{useState} from 'react';
import {useRemote} from '../../controllers/useRemote';
import {useApi} from '../../controllers/ApiProvider';
import {date,money,type Row} from '../../models/types';
import {Field,Form,Panel,Table,options} from '../shared';
export function Finance({mode}:{mode:'closings'|'finance'}){
 const {request,can}=useApi();const {data:customers}=useRemote<Row[]>('/customers',[]),{data:receivables}=useRemote<Row[]>('/receivables',[]),{data:closings}=useRemote<Row[]>('/closings',[]),{data:payments}=useRemote<Row[]>('/payments',[]),{data:balances}=useRemote<Row[]>('/customer-balances',[]);
 const [customer,setCustomer]=useState(''),[selected,setSelected]=useState<number[]>([]),[from,setFrom]=useState(new Date().toISOString().slice(0,10)),[to,setTo]=useState(new Date().toISOString().slice(0,10));
 const [target,setTarget]=useState(''),[amount,setAmount]=useState(''),[method,setMethod]=useState('PIX');
 const eligible=receivables.filter(r=>r.source_type==='SALE'&&Number(r.customer_id)===Number(customer)&&Number(r.due)>0);
 const targets=receivables.filter(r=>Number(r.due)>0);
 if(!can('FINANCE_MANAGE'))return <p>Este perfil não tem permissão para consultar o módulo financeiro.</p>;
 return <>
 <Panel title="Valores em aberto"><Table rows={receivables.filter(x=>Number(x.due)>0)} headers={[{key:'source_type',label:'Tipo'},{key:'source_id',label:'ID'},{key:'customer_name',label:'Cliente'},{key:'due',label:'Saldo',format:money}]}/></Panel>
 {mode==='closings'&&<><Panel title="Fechamentos existentes"><Table rows={closings} headers={[{key:'id',label:'Nº'},{key:'customer_name',label:'Cliente'},{key:'total',label:'Total',format:money},{key:'received',label:'Pago',format:money},{key:'due',label:'Pendente',format:money},{key:'payment_status',label:'Situação'}]}/></Panel>
 <Panel title="Criar fechamento periódico"><div className="form-grid"><Field label="Cliente" value={customer} onChange={v=>{setCustomer(v);setSelected([])}} options={options(customers)}/><Field label="Início do período" value={from} type="date" onChange={setFrom}/><Field label="Fim do período" value={to} type="date" onChange={setTo}/></div>
 <p>Selecione as vendas em aberto (a data real da venda deve estar dentro do período):</p>
 <div className="checks">{eligible.map(r=><label key={r.source_id}><input type="checkbox" checked={selected.includes(Number(r.source_id))} onChange={e=>setSelected(s=>e.target.checked?[...s,Number(r.source_id)]:s.filter(x=>x!==Number(r.source_id)))}/> Venda #{r.source_id} — {money(r.due)}</label>)}</div>
 <button className="button primary" disabled={!selected.length} onClick={async()=>{await request('/closings','POST',{customer_id:Number(customer),period_start:from,period_end:to,sales:selected.map(id=>({id}))});setSelected([])}}>Gerar fechamento</button></Panel></>}
 {mode==='finance'&&<Panel title="Posição por cliente"><Table rows={balances} headers={[{key:'name',label:'Cliente'},{key:'amount_due',label:'Em aberto',format:money}]}/></Panel>}
 <Form title="Registrar recebimento — venda ou fechamento" onSubmit={async()=>{if(!target)return;const [kind,id]=target.split(':');await request('/payments','POST',{amount:Number(amount),method,...(kind==='SALE'?{sale_id:Number(id)}:{closing_id:Number(id)}),idempotency_key:`UI-${Date.now()}`});setTarget('');setAmount('')}}>
 <Field label="Origem do saldo" value={target} onChange={v=>{setTarget(v);const selected=targets.find(r=>`${r.source_type}:${r.source_id}`===v);setAmount(selected?String(selected.due):'')}} options={targets.map(x=>({value:`${x.source_type}:${x.source_id}`,label:`${x.source_type==='SALE'?'Venda':'Fechamento'} #${x.source_id} — ${x.customer_name} (${money(x.due)})`}))} required/>
 <Field label="Valor recebido" type="number" value={amount} onChange={setAmount} required/><Field label="Forma de pagamento" value={method} onChange={setMethod} options={[{value:'PIX',label:'PIX'},{value:'CASH',label:'Dinheiro'},{value:'CARD',label:'Cartão'},{value:'TRANSFER',label:'Transferência'},{value:'OTHER',label:'Outro'}]}/>
 </Form><Panel title="Pagamentos registrados"><Table rows={payments} headers={[{key:'id',label:'ID'},{key:'sale_id',label:'Venda'},{key:'closing_id',label:'Fechamento'},{key:'amount',label:'Valor',format:money},{key:'method',label:'Forma'},{key:'paid_at',label:'Data',format:date}]}/></Panel>
 </>;
}
