import React,{useState} from 'react';
import {useRemote} from '../../controllers/useRemote';
import {useApi} from '../../controllers/ApiProvider';
import {date,money,type Row} from '../../models/types';
import {Field,Form,Panel,Table,options} from '../shared';
export function Products(){
 const {request,can}=useApi();const [q,setQ]=useState('');const {data:products}=useRemote<Row[]>('/products?q='+encodeURIComponent(q),[]);
 const {data:brands}=useRemote<Row[]>('/brands',[]),{data:categories}=useRemote<Row[]>('/categories',[]),{data:units}=useRemote<Row[]>('/units',[]);
 const empty={internal_code:'',description:'',manufacturer_code:'',brand_id:'',category_id:'',unit_id:'',current_cost:'0',manual_margin:'0.4',standard_price:'0',min_stock:'0',max_stock:'100',stock_location:''};
 const [form,setForm]=useState<Row>(empty),[editing,setEditing]=useState<number|null>(null);
 const set=(k:string)=>(v:any)=>setForm(x=>({...x,[k]:v}));
 const save=async()=>{const input={...form,...Object.fromEntries(['brand_id','category_id','unit_id'].map(k=>[k,Number(form[k])])),current_cost:Number(form.current_cost),manual_margin:Number(form.manual_margin),standard_price:Number(form.standard_price),min_stock:Number(form.min_stock),max_stock:Number(form.max_stock)};
  await request('/products'+(editing?'/'+editing:''),editing?'PATCH':'POST',input);setForm(empty);setEditing(null);};
 return <><div className="toolbar"><input placeholder="Pesquisar produto por código ou descrição" value={q} onChange={e=>setQ(e.target.value)}/><span>{products.length} encontrados</span></div>
 <Panel title="Catálogo de produtos"><Table rows={products} onSelect={r=>{setEditing(Number(r.product_id));setForm({internal_code:r.internal_code,description:r.description,manufacturer_code:r.manufacturer_code??'',brand_id:r.brand_id,category_id:r.category_id,unit_id:r.unit_id,current_cost:r.current_cost,manual_margin:r.manual_margin,standard_price:r.standard_price,min_stock:r.min_stock,max_stock:r.max_stock??100,stock_location:r.stock_location??''})}} headers={[{key:'internal_code',label:'Código'},{key:'description',label:'Produto'},{key:'brand',label:'Marca'},{key:'standard_price',label:'Preço',format:money},{key:'on_hand',label:'Saldo'},{key:'stock_status',label:'Situação'}]}/></Panel>
 {can('PRODUCT_WRITE')&&<Panel title={editing?'Editar produto existente':'Novo produto'}><Form title={editing?`Editando #${editing}`:'Cadastro com persistência PostgreSQL'} onSubmit={save}>
 <Field label="Código interno" value={form.internal_code} onChange={set('internal_code')} required/><Field label="Descrição" value={form.description} onChange={set('description')} required/>
 <Field label="Código fabricante" value={form.manufacturer_code} onChange={set('manufacturer_code')}/><Field label="Marca" value={form.brand_id} onChange={set('brand_id')} options={options(brands)} required/>
 <Field label="Categoria" value={form.category_id} onChange={set('category_id')} options={options(categories)} required/><Field label="Unidade" value={form.unit_id} onChange={set('unit_id')} options={units.map(x=>({value:x.id,label:x.symbol}))} required/>
 <Field label="Custo R$" type="number" value={form.current_cost} onChange={set('current_cost')}/><Field label="Margem decimal (0 a 0,99)" type="number" value={form.manual_margin} onChange={set('manual_margin')}/>
 <Field label="Preço padrão R$" type="number" value={form.standard_price} onChange={set('standard_price')}/><Field label="Mínimo" type="number" value={form.min_stock} onChange={set('min_stock')}/>
 <Field label="Máximo" type="number" value={form.max_stock} onChange={set('max_stock')}/><Field label="Localização" value={form.stock_location} onChange={set('stock_location')}/>
 </Form><button className="text-button" onClick={()=>{setEditing(null);setForm(empty)}}>Limpar / Novo cadastro</button></Panel>}
 </>;
}
export function People({kind}:{kind:'customers'|'suppliers'}){
 const {request,can}=useApi();const {data}=useRemote<Row[]>('/'+kind,[]);
 const empty:Row=kind==='customers'?{name:'',document:'',phone:'',email:'',payment_terms:'IMMEDIATE'}:{name:'',document:'',phone:'',email:''};
 const [form,setForm]=useState<Row>(empty),[editing,setEditing]=useState<number|null>(null);
 const allowed=kind==='customers'?can('SALE_CONFIRM'):can('PURCHASE_CONFIRM');
 const update=(k:string)=>(v:any)=>setForm(x=>({...x,[k]:v}));
 return <><Panel title={kind==='customers'?'Clientes cadastrados':'Fornecedores cadastrados'}><Table rows={data} onSelect={r=>{setEditing(Number(r.id));setForm({...r})}} headers={[{key:'name',label:'Nome / Empresa'},{key:'document',label:'Documento'},{key:'phone',label:'Telefone'},{key:'email',label:'E-mail'},{key:'active',label:'Ativo',format:(v)=>v?'Sim':'Não'}]}/></Panel>
 {allowed&&<Panel title={editing?'Editar cadastro':'Novo cadastro'}><Form title="Informações cadastrais" onSubmit={async()=>{const d={name:form.name,document:form.document||null,phone:form.phone||null,email:form.email||null,...(kind==='customers'?{payment_terms:form.payment_terms}:{})};await request('/'+kind+(editing?'/'+editing:''),editing?'PATCH':'POST',d);setEditing(null);setForm(empty)}}>
 <Field label="Nome" value={form.name} onChange={update('name')} required/><Field label="CPF/CNPJ" value={form.document} onChange={update('document')}/><Field label="Telefone" value={form.phone} onChange={update('phone')}/><Field label="E-mail" value={form.email} onChange={update('email')}/>
 {kind==='customers'&&<Field label="Condição" value={form.payment_terms} onChange={update('payment_terms')} options={[{value:'IMMEDIATE',label:'À vista'},{value:'WEEKLY',label:'Semanal'},{value:'BIWEEKLY',label:'Quinzenal'},{value:'MONTHLY',label:'Mensal'},{value:'OTHER',label:'Outro'}]}/>}
 </Form><button className="text-button" onClick={()=>{setEditing(null);setForm(empty)}}>Novo registro</button></Panel>}</>;
}
export function VehicleCatalog({kind}:{kind:'vehicles'|'applications'|'equivalences'}){
 const {request,can}=useApi();const {data:vehicles}=useRemote<Row[]>('/vehicles',[]),{data:products}=useRemote<Row[]>('/products',[]),{data:links}=useRemote<Row[]>('/'+kind,[]);
 const [form,setForm]=useState<Row>({});const set=(k:string)=>(v:any)=>setForm(x=>({...x,[k]:v}));
 if(kind==='vehicles')return <><Panel title="Veículos — base demonstrativa"><Table rows={vehicles} headers={[{key:'manufacturer',label:'Fabricante'},{key:'model',label:'Modelo'},{key:'year_start',label:'Ano inicial'},{key:'year_end',label:'Ano final'},{key:'engine',label:'Motor'},{key:'version',label:'Versão'}]}/></Panel>
 {can('PRODUCT_WRITE')&&<Form title="Cadastrar veículo" onSubmit={async()=>{await request('/vehicles','POST',{manufacturer:form.manufacturer,model:form.model,year_start:Number(form.year_start),year_end:Number(form.year_end),engine:form.engine??'',version:form.version??''});setForm({})}}>
 <Field label="Fabricante" value={form.manufacturer} onChange={set('manufacturer')} required/><Field label="Modelo" value={form.model} onChange={set('model')} required/><Field label="Ano início" type="number" value={form.year_start} onChange={set('year_start')} required/><Field label="Ano fim" type="number" value={form.year_end} onChange={set('year_end')} required/><Field label="Motor" value={form.engine} onChange={set('engine')}/><Field label="Versão" value={form.version} onChange={set('version')}/></Form>}</>;
 if(kind==='applications')return <><p className="disclaimer">Aplicações do seed são fictícias e não representam compatibilidade técnica verificada.</p><Panel title="Aplicações produto × veículo"><Table rows={links} headers={[{key:'internal_code',label:'Produto'},{key:'manufacturer',label:'Fabricante'},{key:'model',label:'Modelo'},{key:'engine',label:'Motor'},{key:'notes',label:'Observações'}]}/></Panel>
 {can('PRODUCT_WRITE')&&<Form title="Vincular aplicação" onSubmit={async()=>{await request('/applications','POST',{product_id:Number(form.product_id),vehicle_id:Number(form.vehicle_id),notes:form.notes??'Compatibilidade demonstrativa — confirmar catálogo'});setForm({})}}>
 <Field label="Produto" value={form.product_id} onChange={set('product_id')} options={products.map(x=>({value:x.product_id,label:x.description}))} required/><Field label="Veículo" value={form.vehicle_id} onChange={set('vehicle_id')} options={vehicles.map(x=>({value:x.id,label:`${x.manufacturer} ${x.model} ${x.engine}`}))} required/><Field label="Observação" value={form.notes} onChange={set('notes')}/></Form>}</>;
 return <><Panel title="Equivalências bidirecionais"><Table rows={links} headers={[{key:'product_code',label:'Produto'},{key:'equivalent_code',label:'Equivalente'},{key:'notes',label:'Observação'}]}/></Panel>
 {can('PRODUCT_WRITE')&&<Form title="Relacionar dois produtos" onSubmit={async()=>{await request('/equivalences','POST',{product_a_id:Number(form.product_a_id),product_b_id:Number(form.product_b_id),notes:form.notes??''});setForm({})}}>
 <Field label="Produto A" value={form.product_a_id} onChange={set('product_a_id')} options={products.map(x=>({value:x.product_id,label:x.description}))} required/><Field label="Produto B" value={form.product_b_id} onChange={set('product_b_id')} options={products.map(x=>({value:x.product_id,label:x.description}))} required/><Field label="Observação" value={form.notes} onChange={set('notes')}/></Form>}</>;
}
