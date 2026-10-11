interface QueryResult<T> {data:T[]|null;error:{message:string}|null}
// Supabase returns at most 1,000 rows by default. Never silently truncate admin totals.
export async function allRows<T>(query:(from:number,to:number)=>PromiseLike<QueryResult<T>>):Promise<QueryResult<T>> {
  const rows:T[]=[];
  for(let from=0;;from+=1000) {
    const result=await query(from,from+999);
    if(result.error)return {data:null,error:result.error};
    rows.push(...(result.data ?? []));
    if(!result.data || result.data.length<1000)return {data:rows,error:null};
  }
}
