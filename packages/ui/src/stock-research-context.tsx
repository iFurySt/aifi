import { createContext, useContext, useEffect, useState } from "react";
import { emptyResearch, type StockResearch, type StockResearchRepository } from "@aifi/core";
import { createLocalStockResearch } from "@aifi/platform";
export const StockResearchContext=createContext<StockResearchRepository>(createLocalStockResearch());
type Entry={data?:StockResearch;pending?:Promise<StockResearch>;at:number};
const caches=new WeakMap<StockResearchRepository,Map<string,Entry>>();
function cacheFor(repository:StockResearchRepository){let cache=caches.get(repository);if(!cache){cache=new Map();caches.set(repository,cache);}return cache;}
function read(repository:StockResearchRepository,symbol:string,force=false):Promise<StockResearch>{
 const cache=cacheFor(repository),entry=cache.get(symbol)??{at:0};
 if(entry.pending)return entry.pending;
 if(!force&&entry.data&&Date.now()-entry.at<30000)return Promise.resolve(entry.data);
 cache.set(symbol,entry);
 entry.pending=repository.get(symbol).then(data=>{if(data.symbol!==symbol)throw Error("Stock response does not match its request.");entry.data=data;entry.at=Date.now();return data;}).finally(()=>{entry.pending=undefined;while(cache.size>24){const oldest=cache.keys().next().value!;if(oldest===symbol)break;cache.delete(oldest);}});
 return entry.pending;
}
export function prepareStockResearch(repository:StockResearchRepository,symbol:string){const stored=cacheFor(repository).get(symbol)?.data;const request=read(repository,symbol);if(stored){void request.catch(()=>{});return Promise.resolve(stored);}return request;}
export function useStockResearch(symbol:string){
 const repository=useContext(StockResearchContext);
 const [state,setState]=useState<{symbol:string;data:StockResearch;error:string;loading:boolean}>(()=>({symbol,data:cacheFor(repository).get(symbol)?.data??emptyResearch(symbol),error:"",loading:!cacheFor(repository).get(symbol)?.data}));
 useEffect(()=>{let active=true;const refresh=async()=>{try{const data=await read(repository,symbol,true);if(active)setState({symbol,data,error:"",loading:false});}catch{if(active)setState(old=>({symbol,data:old.symbol===symbol?old.data:cacheFor(repository).get(symbol)?.data??emptyResearch(symbol),error:"Local data unavailable",loading:false}));}};void refresh();const timer=setInterval(()=>void refresh(),30000);window.addEventListener("focus",refresh);return()=>{active=false;clearInterval(timer);window.removeEventListener("focus",refresh);};},[repository,symbol]);
 return state.symbol===symbol?state:{symbol,data:cacheFor(repository).get(symbol)?.data??emptyResearch(symbol),error:"",loading:!cacheFor(repository).get(symbol)?.data};
}
