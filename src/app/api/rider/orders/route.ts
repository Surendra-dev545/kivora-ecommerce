import { NextResponse } from 'next/server';
import { getVerifiedUser } from '@/lib/server/rider-auth';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const auth = await getVerifiedUser(request); if ('response' in auth) return auth.response;
  const { data: rider } = await auth.client.from('rider_profiles').select('display_name,active').eq('user_id', auth.user.id).maybeSingle();
  if (!rider?.active) return NextResponse.json({ error: 'This account is not enabled as a Kivora rider. Ask the store admin to activate it.' }, { status: 403 });
  const { data, error } = await auth.client.from('orders').select('id,order_number,customer_name,shipping_address,status,assigned_rider_id').eq('assigned_rider_id',auth.user.id).in('status',['shipped','out_for_delivery']).order('created_at',{ascending:false});
  if(error) return NextResponse.json({error:'Could not load assigned deliveries.'},{status:500});
  const ids=(data??[]).map(o=>o.id);
  const {data:locations}=ids.length ? await auth.client.from('order_delivery_tracking').select('order_id,latitude,longitude,updated_at').in('order_id',ids) : {data:[]};
  return NextResponse.json({rider,orders:data??[],locations:locations??[]});
}
