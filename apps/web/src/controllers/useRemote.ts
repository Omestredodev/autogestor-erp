import {useEffect,useState} from 'react';
import {useApi} from './ApiProvider';
export function useRemote<T=any>(path:string,initial:T):{data:T;loading:boolean;refresh:()=>void}{
 const {revision,request}=useApi();const [data,setData]=useState<T>(initial),[loading,setLoading]=useState(true),[version,setVersion]=useState(0);
 useEffect(()=>{let active=true;setLoading(true);request<T>(path).then(x=>{if(active)setData(x)}).catch(()=>{}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[path,revision,version]);
 return {data,loading,refresh:()=>setVersion(x=>x+1)};
}
