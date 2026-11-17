import React,{createContext,useContext,useMemo,useState} from 'react';
import type {HttpMethod,User} from '../models/types';
const base=import.meta.env.VITE_API_URL||'http://127.0.0.1:3001/api/v1';
type RegisterInput={name:string;email:string;password:string;confirmPassword:string};
type Context={user:User|null;token:string|null;revision:number;busy:boolean;message:string;error:string;
 login:(email:string,password:string)=>Promise<void>;register:(input:RegisterInput)=>Promise<string>;
 changePassword:(oldPassword:string,newPassword:string,confirmPassword:string)=>Promise<void>;
 logout:()=>Promise<void>;request:<T=any>(path:string,method?:HttpMethod,payload?:any)=>Promise<T>;
 can:(code:string)=>boolean;clear:()=>void};
const C=createContext<Context>(null!);
export const useApi=()=>useContext(C);
async function bodyJson(response:Response):Promise<any>{try{return await response.json()}catch{return {message:'Resposta inesperada da API'}}}
function networkError(e:unknown):Error {
 if(e instanceof TypeError)return new Error('Não foi possível conectar à API. Confira se o NestJS está aberto na porta 3001 e se você reiniciou o servidor após atualizar o CORS.');
 return e instanceof Error?e:new Error(String(e));
}
function resultError(response:Response,data:any):Error{
 const message=Array.isArray(data?.message)?data.message.join('; '):data?.message;
 return new Error(String(message??`Erro HTTP ${response.status}`));
}
export function ApiProvider({children}:{children:React.ReactNode}){
 const [user,setUser]=useState<User|null>(null),[token,setToken]=useState<string|null>(null);
 const [revision,setRevision]=useState(0),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
 const clear=()=>{setMessage('');setError('')};
 const clearSession=()=>{setToken(null);setUser(null);setRevision(x=>x+1)};
 async function request<T=any>(path:string,method:HttpMethod='GET',payload?:any):Promise<T>{
  if(method!=='GET')setBusy(true);clear();
  try{
   const response=await fetch(base+path,{method,headers:{...(token?{Authorization:`Bearer ${token}`}:{}) ,...(method!=='GET'?{'Content-Type':'application/json'}:{})},body:method==='GET'?undefined:JSON.stringify(payload??{})});
   const data=await bodyJson(response);
   if(!response.ok){if(response.status===401)clearSession();throw resultError(response,data)}
   if(method!=='GET'){setRevision(x=>x+1);setMessage('Operação concluída e registrada no banco.')}
   return data as T;
  }catch(e){setError(networkError(e).message);throw networkError(e)}
  finally{if(method!=='GET')setBusy(false)}
 }
 async function login(email:string,password:string){setBusy(true);clear();try{
  const response=await fetch(base+'/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});
  const data=await bodyJson(response);if(!response.ok)throw resultError(response,data);
  const me=await fetch(base+'/auth/me',{headers:{Authorization:`Bearer ${data.accessToken}`}});
  const account=await bodyJson(me);if(!me.ok)throw resultError(me,account);
  setToken(data.accessToken);setUser(account);setRevision(x=>x+1);
 }catch(e){setError(networkError(e).message);throw networkError(e)}finally{setBusy(false)}}
 async function register(input:RegisterInput):Promise<string>{setBusy(true);clear();try{
  const response=await fetch(base+'/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});
  const data=await bodyJson(response);if(!response.ok)throw resultError(response,data);
  return String(data.message??'Solicitação enviada para aprovação.');
 }catch(e){setError(networkError(e).message);throw networkError(e)}finally{setBusy(false)}}
 async function changePassword(oldPassword:string,newPassword:string,confirmPassword:string){
  await request('/auth/change-password','POST',{oldPassword,newPassword,confirmPassword});
  clearSession();setError('');setMessage('Senha alterada. Entre novamente com a nova senha.');
 }
 async function logout(){
  const activeToken=token;
  clearSession();clear();
  if(activeToken){try{await fetch(base+'/auth/logout',{method:'POST',headers:{Authorization:`Bearer ${activeToken}`}})}catch{ /* sessão expira pelo token; rede pode estar indisponível */ }}
 }
 const ctx=useMemo<Context>(()=>({user,token,revision,busy,message,error,login,register,changePassword,logout,request,can:(code:string)=>!!user?.permissions.includes(code)||user?.profile==='ADMIN',clear}),[user,token,revision,busy,message,error]);
 return <C.Provider value={ctx}>{children}</C.Provider>;
}
