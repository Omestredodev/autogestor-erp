import React,{createContext,useContext,useMemo,useState} from 'react';
import type {HttpMethod,User} from '../models/types';
const base=import.meta.env.VITE_API_URL||'http://localhost:3001/api/v1';
type Context={user:User|null;token:string|null;revision:number;busy:boolean;message:string;error:string;login:(email:string,password:string)=>Promise<void>;logout:()=>void;request:<T=any>(path:string,method?:HttpMethod,payload?:any)=>Promise<T>;can:(code:string)=>boolean;clear:()=>void};
const C=createContext<Context>(null!);
export const useApi=()=>useContext(C);
export function ApiProvider({children}:{children:React.ReactNode}){
 const [user,setUser]=useState<User|null>(null),[token,setToken]=useState<string|null>(null),[revision,setRevision]=useState(0),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
 async function request<T=any>(path:string,method:HttpMethod='GET',payload?:any):Promise<T>{
  if(method!=='GET')setBusy(true);setError('');setMessage('');
  try{
   const response=await fetch(base+path,{method,headers:{...(token?{Authorization:`Bearer ${token}`}:{}) ,...(method!=='GET'?{'Content-Type':'application/json'}:{})},body:method==='GET'?undefined:JSON.stringify(payload??{})});
   let result:any;try{result=await response.json()}catch{result={message:'Resposta inesperada da API'}};
   if(!response.ok){const msg=Array.isArray(result?.message)?result.message.join('; '):result?.message;throw new Error(String(msg??`Erro HTTP ${response.status}`));}
   if(method!=='GET'){setRevision(x=>x+1);setMessage('Operação concluída e registrada no banco.');}
   return result as T;
  }catch(e){setError(e instanceof Error?e.message:String(e));throw e;}
  finally{if(method!=='GET')setBusy(false);}
 }
 async function login(email:string,password:string){setBusy(true);setError('');try{
  const res=await fetch(base+'/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});
  const data=await res.json();if(!res.ok)throw new Error(data.message??'Falha no login');
  setToken(data.accessToken);
  const me=await fetch(base+'/auth/me',{headers:{Authorization:`Bearer ${data.accessToken}`}});
  if(!me.ok)throw new Error('Sessão não confirmada');setUser(await me.json());setRevision(x=>x+1);
 }catch(e){setError(e instanceof Error?e.message:String(e));throw e;}finally{setBusy(false)}}
 function logout(){setToken(null);setUser(null);setRevision(x=>x+1);setMessage('');setError('');}
 const ctx=useMemo(()=>({user,token,revision,busy,message,error,login,logout,request,can:(code:string)=>!!user?.permissions.includes(code)||user?.profile==='ADMIN',clear:()=>{setMessage('');setError('')}}),[user,token,revision,busy,message,error]);
 return <C.Provider value={ctx}>{children}</C.Provider>;
}
