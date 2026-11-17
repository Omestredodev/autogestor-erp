import React,{useState} from 'react';
import {useApi} from '../../controllers/ApiProvider';
import {useRemote} from '../../controllers/useRemote';
import {date,type Row} from '../../models/types';
import {Field,Form,Panel,Table,options} from '../shared';
export function Reminders(){const {request,can}=useApi();const {data:items}=useRemote<Row[]>('/reminders',[]),{data:customers}=useRemote<Row[]>('/customers',[]),{data:products}=useRemote<Row[]>('/products',[]);
 const [f,setF]=useState<Row>({title:'',description:'',scheduled_for:'',customer_id:'',product_id:''});const set=(k:string)=>(v:any)=>setF(x=>({...x,[k]:v}));
 return <><Panel title="Lembretes pessoais e compartilhados"><Table rows={items} headers={[{key:'title',label:'Título'},{key:'scheduled_for',label:'Programado',format:date},{key:'status',label:'Status'},{key:'description',label:'Descrição'}]}/></Panel>
 {can('REMINDER_MANAGE')&&<><Form title="Criar lembrete contextual" onSubmit={async()=>{await request('/reminders','POST',{...f,scheduled_for:new Date(f.scheduled_for).toISOString(),customer_id:f.customer_id?Number(f.customer_id):null,product_id:f.product_id?Number(f.product_id):null});setF({title:'',description:'',scheduled_for:'',customer_id:'',product_id:''})}}>
 <Field label="Título" value={f.title} onChange={set('title')} required/><Field label="Descrição" value={f.description} onChange={set('description')}/><Field label="Data e horário" type="datetime-local" value={f.scheduled_for} onChange={set('scheduled_for')} required/><Field label="Cliente relacionado" value={f.customer_id} onChange={set('customer_id')} options={options(customers)}/><Field label="Produto relacionado" value={f.product_id} onChange={set('product_id')} options={products.map(x=>({value:x.product_id,label:x.description}))}/>
 </Form><Panel title="Ações de lembretes"><div className="actions-list">{items.filter(x=>['PENDING','SNOOZED'].includes(x.status)).map(x=><div key={x.id} className="action-row"><b>{x.title}</b><span>{date(x.scheduled_for)}</span><button className="tiny" onClick={()=>request(`/reminders/${x.id}/action`,'PATCH',{action:'SNOOZED',minutes:30})}>Adiar 30min</button><button className="tiny" onClick={()=>request(`/reminders/${x.id}/action`,'PATCH',{action:'DONE'})}>Concluir</button><button className="tiny" onClick={()=>request(`/reminders/${x.id}/action`,'PATCH',{action:'CANCELLED'})}>Cancelar</button></div>)}</div></Panel></>}</>;
}
export function Audit(){const {can}=useApi();const [entity,setEntity]=useState('');const {data}=useRemote<Row[]>('/audit?entity='+encodeURIComponent(entity),[]);
 if(!can('AUDIT_READ'))return <p>Sem permissão para auditoria.</p>;
 return <Panel title="Auditoria de alterações" actions={<input value={entity} onChange={e=>setEntity(e.target.value)} placeholder="Filtrar entidade: sales, products…"/>}><Table rows={data} headers={[{key:'id',label:'Evento'},{key:'happened_at',label:'Quando',format:date},{key:'actor_name',label:'Usuário'},{key:'entity',label:'Entidade'},{key:'record_id',label:'ID'},{key:'action',label:'Operação'}]}/></Panel>;
}
export function Admin(){const {request,user}=useApi();const {data:users}=useRemote<Row[]>('/users',[]),{data:profiles}=useRemote<Row[]>('/profiles',[]);
 const [f,setF]=useState<Row>({name:'',email:'',password:'',profile_id:''});const set=(k:string)=>(v:any)=>setF(x=>({...x,[k]:v}));
 if(user?.profile!=='ADMIN')return <p>Apenas administradores podem gerenciar usuários.</p>;
 return <><Panel title="Usuários e perfis"><Table rows={users} headers={[{key:'id',label:'ID'},{key:'name',label:'Nome'},{key:'email',label:'Email'},{key:'profile',label:'Perfil'},{key:'active',label:'Ativo',format:x=>x?'Sim':'Não'}]}/></Panel>
 <Form title="Cadastrar usuário com senha protegida" onSubmit={async()=>{await request('/users','POST',{name:f.name,email:f.email,password:f.password,profile_id:Number(f.profile_id)});setF({name:'',email:'',password:'',profile_id:''})}}>
 <Field label="Nome" value={f.name} onChange={set('name')} required/><Field label="Email" type="email" value={f.email} onChange={set('email')} required/><Field label="Senha (mín. 12 caracteres)" type="password" value={f.password} onChange={set('password')} required/><Field label="Perfil" value={f.profile_id} onChange={set('profile_id')} options={options(profiles)} required/>
 </Form></>;
}
