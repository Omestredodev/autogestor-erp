import React,{useEffect,useState} from 'react';
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
export function Admin(){
 const {request,user}=useApi();
 const {data:users,refresh:refreshUsers}=useRemote<Row[]>('/users',[]),{data:profiles}=useRemote<Row[]>('/profiles',[]);
 // Recarrega solicitações criadas em outra guia. Também há botão de atualização manual.
 useEffect(()=>{const id=window.setInterval(()=>refreshUsers(),8000);return()=>window.clearInterval(id)},[]);
 const [pendingProfiles,setPendingProfiles]=useState<Record<number,string>>({});
 const [f,setF]=useState<Row>({name:'',email:'',profile_id:''});
 const [editing,setEditing]=useState<Row|null>(null);
 const [credential,setCredential]=useState<{email:string;password:string}|null>(null);
 const [actionError,setActionError]=useState('');
 const set=(k:string)=>(v:any)=>setF(x=>({...x,[k]:v}));
 if(user?.profile!=='ADMIN')return <p>Apenas administradores podem gerenciar usuários.</p>;
 async function run(action:()=>Promise<any>){setCredential(null);setActionError('');try{return await action()}catch(e){setActionError(e instanceof Error?e.message:String(e));return null}}
 const status=(u:Row)=>u.deleted_at?'Excluído':u.approval_status==='PENDING'?'Pendente':u.active?'Ativo':'Inativo';
 const optionsList=options(profiles);
 const approvePending=(u:Row)=>{const profile_id=Number(pendingProfiles[Number(u.id)]);
  if(!Number.isSafeInteger(profile_id)||profile_id<1){setActionError(`Escolha o perfil de ${u.name} antes da aprovação.`);return;}
  run(()=>request(`/users/${u.id}/approve`,'POST',{profile_id}));
 };
 const actions=(_v:any,u:Row)=><div className="admin-actions">
  {!u.deleted_at&&u.approval_status==='PENDING'&&<>
   <select aria-label={`Perfil para aprovar ${u.name}`} value={pendingProfiles[Number(u.id)]??''}
    onChange={e=>setPendingProfiles(x=>({...x,[Number(u.id)]:e.target.value}))}>
    <option value="">Escolha o perfil…</option>
    {optionsList.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
   </select>
   <button disabled={!pendingProfiles[Number(u.id)]} onClick={()=>approvePending(u)}>Aprovar com perfil</button>
  </>}
  {!u.deleted_at&&<button onClick={()=>{setEditing({...u});setCredential(null)}}>Editar</button>}
  {!u.deleted_at&&u.approval_status==='APPROVED'&&u.active&&Number(u.id)!==user?.id&&<button onClick={()=>{if(window.confirm(`Desativar ${u.name}? Ele perderá acesso imediatamente.`))run(()=>request(`/users/${u.id}/deactivate`,'POST',{}))}}>Desativar</button>}
  {!u.deleted_at&&u.approval_status==='APPROVED'&&!u.active&&<button onClick={()=>run(()=>request(`/users/${u.id}/reactivate`,'POST',{}))}>Reativar</button>}
  {!u.deleted_at&&u.approval_status==='APPROVED'&&<button onClick={()=>run(async()=>{const r=await request<{temporaryPassword:string;email:string}>(`/users/${u.id}/reset-password`,'POST',{});setCredential({email:r.email,password:r.temporaryPassword});return r})}>Redefinir senha</button>}
  {!u.deleted_at&&Number(u.id)!==user?.id&&<button className="danger-action" onClick={()=>{if(window.confirm(`Excluir ${u.name}? Essa ação é lógica e preserva o histórico de vendas e auditoria. A conta não poderá acessar o sistema.`))run(()=>request(`/users/${u.id}`,'DELETE'))}}>Excluir</button>}
 </div>;
 return <>
 <Panel title="Administração de contas e aprovações" actions={<div className="admin-toolbar">
   <button className="button secondary" type="button" onClick={refreshUsers}>Atualizar solicitações</button>
   <button className="button secondary" type="button" onClick={()=>window.open(window.location.origin+'/?cadastro=1','_blank','noopener,noreferrer')}>Abrir cadastro em outra aba</button>
  </div>}><p className="disclaimer" style={{margin:'14px 20px'}}>Novos cadastros ficam pendentes. Selecione o perfil no próprio cadastro antes de aprovar. A lista é atualizada a cada 8 segundos; você também pode clicar em Atualizar solicitações. Desativar bloqueia temporariamente; excluir preserva o histórico.</p>
 {actionError&&<p role="alert" className="form-error" style={{margin:'12px 20px'}}>{actionError}</p>}
 <Table rows={users} headers={[{key:'id',label:'ID'},{key:'name',label:'Nome'},{key:'email',label:'E-mail'},{key:'profile',label:'Perfil'},{key:'approval_status',label:'Situação',format:(_v,u)=><span className={'status-pill '+(u.deleted_at?'deleted':u.approval_status==='PENDING'?'pending':u.active?'approved':'')}>{status(u)}</span>},{key:'must_change_password',label:'Troca pendente',format:v=>v?'Sim':'Não'},{key:'id',label:'Ações',format:actions}]}/>
 </Panel>
 {credential&&<div className="credential-note" role="status"><strong>Senha temporária individual de {credential.email}</strong>
 <p>Copie agora e entregue ao titular por um canal seguro. Ela será exigida no próximo login, e esta tela não a exibirá novamente.</p>
 <code>{credential.password}</code><button className="button secondary" onClick={()=>setCredential(null)}>Ocultar senha</button></div>}
 {editing&&<Panel title={'Editar usuário: '+editing.name}><form className="form" onSubmit={e=>{e.preventDefault();run(async()=>{await request(`/users/${editing.id}`,'PATCH',{name:editing.name,email:editing.email,profile_id:Number(editing.profile_id)});setEditing(null)})}}>
 <div className="form-grid"><Field label="Nome" value={editing.name} onChange={v=>setEditing(x=>x?{...x,name:v}:x)} required/>
 <Field label="E-mail" value={editing.email} type="email" onChange={v=>setEditing(x=>x?{...x,email:v}:x)} required/>
 <Field label="Perfil" value={String(editing.profile_id)} options={optionsList} onChange={v=>setEditing(x=>x?{...x,profile_id:v}:x)} required/></div>
 <button className="button primary" type="submit">Salvar mudanças</button> <button className="button secondary" type="button" onClick={()=>setEditing(null)}>Cancelar</button></form></Panel>}
 <Form title="Criar conta pelo administrador" onSubmit={async()=>{setCredential(null);const created=await request<{email:string;temporaryPassword:string|null}>('/users','POST',{name:f.name,email:f.email,profile_id:Number(f.profile_id)});
  if(created.temporaryPassword)setCredential({email:created.email,password:created.temporaryPassword});setF({name:'',email:'',profile_id:''})}}>
 <Field label="Nome" value={f.name} onChange={set('name')} required/><Field label="E-mail" type="email" value={f.email} onChange={set('email')} required/>
 <Field label="Perfil" value={f.profile_id} onChange={set('profile_id')} options={optionsList} required/>
 <p className="disclaimer">O sistema gera senha temporária única para esta conta e obriga a troca no primeiro acesso. Não use a mesma senha para usuários diferentes.</p>
 </Form>
 </>;
}
