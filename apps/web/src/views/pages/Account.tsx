import React,{useState} from 'react';
import {useApi} from '../../controllers/ApiProvider';
import {Field,Panel} from '../shared';
export function Account({forced=false}:{forced?:boolean}){
 const {user,changePassword,busy,logout}=useApi();
 const [oldPassword,setOld]=useState(''),[newPassword,setNew]=useState(''),[confirmPassword,setConfirm]=useState('');
 const [error,setError]=useState('');
 return <div className={forced?'login-wrap':''}>
 <div className={forced?'login-card':''}>
 {forced&&<h1>Primeiro acesso</h1>}
 <Panel title={forced?'Troque sua senha temporária':'Minha conta e segurança'}>
 <p className="disclaimer">{forced?'Para proteger sua conta, escolha uma senha individual antes de usar o ERP.':'Sua senha é pessoal. Ao alterá-la, todas as sessões anteriores serão encerradas.'}</p>
 <div className="account-summary"><b>{user?.name}</b><span>{user?.email} · Perfil {user?.profile}</span></div>
 <form className="form" autoComplete="off" onSubmit={async e=>{e.preventDefault();setError('');if(newPassword!==confirmPassword){setError('As novas senhas não conferem');return}
  try{await changePassword(oldPassword,newPassword,confirmPassword)}catch(err){setError(err instanceof Error?err.message:String(err))}
 }}>
 <div className="form-grid">
 <Field label="Senha atual" type="password" value={oldPassword} onChange={setOld} required/>
 <Field label="Nova senha (mínimo 12 caracteres)" type="password" value={newPassword} onChange={setNew} required/>
 <Field label="Confirmar nova senha" type="password" value={confirmPassword} onChange={setConfirm} required/>
 </div>
 {error&&<p role="alert" className="form-error">{error}</p>}
 <button type="submit" className="button primary" disabled={busy||newPassword.length<12||!oldPassword}>{busy?'Alterando…':'Alterar senha e entrar novamente'}</button>
 </form>
 </Panel>
 {forced&&<button className="button secondary wide" onClick={()=>{logout().catch(()=>{})}}>Sair</button>}
 </div></div>;
}
