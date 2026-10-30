import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server/rider-auth';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const auth=await requireAdmin(request); if('response' in auth) return auth.response;
 const {data,error}=await auth.client.from('rider_profiles').select('user_id,display_name,active').eq('active',true).order('display_name');
 if(error)return NextResponse.json({error:'Could not load riders. Apply the rider tracking database migration first.'},{status:500});
 return NextResponse.json({riders:data??[]});
}
export async function PATCH(request:Request){
 const auth=await requireAdmin(request); if('response' in auth) return auth.response;
 let body:{orderId?:string;riderId?:string|null}; try{body=await request.json()}catch{return NextResponse.json({error:'Invalid request.'},{status:400})}
 if(!body.orderId)return NextResponse.json({error:'Order is required.'},{status:400});
 if(body.riderId){const {data:r}=await auth.client.from('rider_profiles').select('user_id').eq('user_id',body.riderId).eq('active',true).maybeSingle();if(!r)return NextResponse.json({error:'Choose an active rider.'},{status:400})}
 const {data,error}=await auth.client.from('orders').update({assigned_rider_id:body.riderId??null,updated_at:new Date().toISOString()}).eq('id',body.orderId).select('id,assigned_rider_id').maybeSingle();
 if(error)return NextResponse.json({error:'Could not assign this delivery.'},{status:500});
 if(!data)return NextResponse.json({error:'Order not found.'},{status:404});
 return NextResponse.json({order:data});
}
