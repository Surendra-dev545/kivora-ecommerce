import { NextResponse } from 'next/server';
import { getVerifiedUser } from '@/lib/server/rider-auth';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
 const auth=await getVerifiedUser(request); if('response' in auth) return auth.response;
 const orderId=new URL(request.url).searchParams.get('orderId');
 if(!orderId) return NextResponse.json({error:'Order ID is required.'},{status:400});
 const {data:order}=await auth.client.from('orders').select('id,user_id,status,shipping_address,assigned_rider_id').eq('id',orderId).maybeSingle();
 if(!order || order.user_id!==auth.user.id) return NextResponse.json({error:'Order not found.'},{status:404});
 const [{data:location},{data:rider}]=await Promise.all([
  auth.client.from('order_delivery_tracking').select('latitude,longitude,accuracy_m,updated_at').eq('order_id',orderId).maybeSingle(),
  order.assigned_rider_id
   ? auth.client.from('rider_profiles').select('display_name').eq('user_id',order.assigned_rider_id).maybeSingle()
   : Promise.resolve({data:null}),
 ]);
 return NextResponse.json({location:location??null,rider:rider??null,destinationAddress:order.shipping_address??''});
}
