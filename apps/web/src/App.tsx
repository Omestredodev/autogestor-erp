import React,{useState} from 'react';
import {Package,Boxes,LayoutDashboard,ShoppingCart,Wallet,Truck,Users,UserRound,Car,Repeat,CalendarClock,ShieldCheck,Database,Zap,ClipboardList,LogOut,LockKeyhole} from 'lucide-react';
import {useApi} from './controllers/ApiProvider';
import {useRemote} from './controllers/useRemote';
import {money,date,type Page,type Row} from './models/types';
import {Panel,Table} from './views/shared';
import {Products,People,VehicleCatalog} from './views/pages/Catalog';
import {Inventory,Purchases,Sales} from './views/pages/Operations';
import {Finance} from './views/pages/Finance';
import {Reminders,Audit,Admin} from './views/pages/Admin';
const nav:{id:Page;label:string;icon:React.ComponentType<{size?:number}>;permission?:string;admin?:boolean}[]=[
 {id:'dashboard',label:'Dashboard',icon:LayoutDashboard},{id:'products',label:'Produtos',icon:Package},{id:'vehicles',label:'Veículos',icon:Car},{id:'applications',label:'Aplicações automotivas',icon:Car},{id:'equivalences',label:'Equivalências',icon:Repeat},
 {id:'customers',label:'Clientes',icon:Users},{id:'suppliers',label:'Fornecedores',icon:Truck},{id:'purchases',label:'Compras',icon:ShoppingCart,permission:'PURCHASE_CONFIRM'},{id:'inventory',label:'Estoque',icon:Boxes},
 {id:'sales',label:'Vendas',icon:ClipboardList},{id:'closings',label:'Fechamentos',icon:Wallet,permission:'FINANCE_MANAGE'},{id:'finance',label:'Financeiro',icon:Wallet,permission:'FINANCE_MANAGE'},
 {id:'reminders',label:'Lembretes',icon:CalendarClock,permission:'REMINDER_MANAGE'},{id:'audit',label:'Auditoria',icon:ShieldCheck,permission:'AUDIT_READ'},{id:'admin',label:'Administração',icon:UserRound,admin:true}];
function Login(){const {login,busy,error}=useApi();const [email,setEmail]=useState('admin@demo.invalid'),[password,setPassword]=useState('');
 return <div className="login-wrap"><div className="login-card"><div className="login-logo"><Package size={32}/><div><h1>Peça-Aqui</h1><small>Gestão automotiva integrada</small></div></div><h2>Entrar no sistema</h2><p>Use as credenciais configuradas no banco demonstrativo.</p>
 <form onSubmit={e=>{e.preventDefault();login(email,password).catch(()=>{})}}><label className="field"><span>Email</span><input type="email" value={email} onChange={e=>setEmail(e.target.value)} required/></label><label className="field"><span>Senha</span><input type="password" value={password} onChange={e=>setPassword(e.target.value)} required/></label>
 {error&&<p className="form-error">{error}</p>}<button className="button primary wide" disabled={busy} type="submit">{busy?'Validando…':'Entrar'}</button></form><p className="disclaimer">A senha deve ser ativada localmente pelo comando <code>npm run auth:seed</code> na API. Não há senha padrão no repositório.</p></div></div>;
}
function Dashboard(){const {data:d}=useRemote<Row>('/dashboard',{}),{data:recent}=useRemote<Row[]>('/dashboard/recent',[]);
 const cards=[['Faturamento hoje',money(d.revenue_today)],['Faturamento no mês',money(d.revenue_month)],['Vendas confirmadas',d.confirmed_sales??0],['Estoque baixo',d.low_stock_products??0],['Contas a receber',money(d.accounts_receivable)],['Fechamentos pendentes',d.pending_closings??0],['Lembretes do dia',d.reminders_today??0]];
 return <><div className="stats">{cards.map(([n,v])=><div key={String(n)} className="stat"><span>{n}</span><strong>{v}</strong></div>)}</div><Panel title="Vendas recentes"><Table rows={recent} headers={[{key:'sale_number',label:'Venda'},{key:'customer_name',label:'Cliente'},{key:'status',label:'Status'},{key:'net_total',label:'Valor',format:money},{key:'created_at',label:'Data',format:date}]}/></Panel><p className="disclaimer">Indicadores calculados pelas views do PostgreSQL, não por valores demonstrativos fixos no navegador.</p></>;
}
export function App(){const {user,logout,error,message,clear,can}=useApi();const [page,setPage]=useState<Page>('dashboard'),[collapsed,setCollapsed]=useState(false);
 if(!user)return <Login/>;
 const selected=nav.find(x=>x.id===page),available=nav.filter(x=>(!x.permission||can(x.permission))&&(!x.admin||user.profile==='ADMIN'));
 const route=()=>{switch(page){case 'dashboard':return <Dashboard/>;case 'products':return <Products/>;case 'customers':return <People kind="customers"/>;case 'suppliers':return <People kind="suppliers"/>;
 case 'vehicles':case 'applications':case 'equivalences':return <VehicleCatalog kind={page}/>;case 'inventory':return <Inventory/>;case 'purchases':return <Purchases/>;case 'sales':return <Sales/>;
 case 'closings':case 'finance':return <Finance mode={page}/>;case 'reminders':return <Reminders/>;case 'audit':return <Audit/>;case 'admin':return <Admin/>;default:return null;}};
 return <div className="shell"><aside className={'sidebar'+(collapsed?' collapsed':'')}><div className="brand"><div className="brand-icon"><Package size={20}/></div>{!collapsed&&<div><strong>Peça-Aqui</strong><small>Gestão inteligente</small></div>}</div><nav>{available.map(x=><button key={x.id} className={page===x.id?'selected':''} onClick={()=>{setPage(x.id);clear()}}><x.icon size={19}/>{!collapsed&&<span>{x.label}</span>}</button>)}</nav><button className="side-bottom" onClick={()=>setCollapsed(x=>!x)}>{collapsed?'»':'« Recolher'}</button></aside>
 <div className={'content'+(collapsed?' wide':'')}><header className="topbar"><span className="brand-name">Peça-Aqui / {selected?.label??'Dashboard'}</span><div className="user-info"><span><b>{user.name}</b> · {user.profile}</span><button className="text-button" onClick={logout}><LogOut size={16}/> Sair</button></div></header><main><div className="page-title"><small>Peça-Aqui › {selected?.label}</small><h1>{selected?.label}</h1></div>
 {error&&<div role="alert" className="alert danger-alert" onClick={clear}>{error} ×</div>}{message&&<div className="alert success-alert" onClick={clear}>{message} ×</div>}{route()}</main><footer className="footer">Peça-Aqui • MVP acadêmico • PostgreSQL 17 + NestJS + React • Ambiente local</footer></div></div>;
}
