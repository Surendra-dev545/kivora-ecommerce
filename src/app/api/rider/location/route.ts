import { NextResponse } from 'next/server';
import { getVerifiedUser } from '@/lib/server/rider-auth';
export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  const auth=await getVerifiedUser(request); if('response' in auth) return auth.response;
  const {data:rider}=await auth.client.from('rider_profiles').select('active').eq('user_id',auth.user.id).maybeSingle();
  if(!rider?.active) return NextResponse.json({error:'Rider access is not enabled.'},{status:403});
  let body:{orderId?:string;latitude?:number;longitude?:number;accuracy?:number};
  try{body=await request.json()}catch{return NextResponse.json({error:'Invalid request.'},{status:400})}
  const {orderId,latitude,longitude,accuracy}=body;
  if(!orderId || !Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude! < -90 || latitude! > 90 || longitude! < -180 || longitude! > 180) return NextResponse.json({error:'Valid order and GPS coordinates are required.'},{status:400});
  const {data:order}=await auth.client.from('orders').select('id,status,assigned_rider_id').eq('id',orderId).maybeSingle();
  if(!order || order.assigned_rider_id!==auth.user.id || !['shipped','out_for_delivery'].includes(order.status)) return NextResponse.json({error:'This delivery is not assigned to your account or is no longer active.'},{status:403});
  const {error}=await auth.client.from('order_delivery_tracking').upsert({order_id:orderId,rider_id:auth.user.id,latitude,longitude,accuracy_m:Number.isFinite(accuracy)?accuracy:null,updated_at:new Date().toISOString()},{onConflict:'order_id'});
  if(error) return NextResponse.json({error:'Could not save your location.'},{status:500});
  return NextResponse.json({ok:true,updatedAt:new Date().toISOString()});
}
