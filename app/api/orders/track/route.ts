import { NextResponse } from 'next/server';
import { parseJson } from '@/lib/db';
import { query, queryOne } from '@/lib/postgres';
import { getHomepageContent } from '@/lib/site-content';
export const runtime='nodejs'; export const dynamic='force-dynamic';
export async function GET(req:Request){
  const u=new URL(req.url); const orderNumber=(u.searchParams.get('order')||'').trim(); const email=(u.searchParams.get('email')||'').trim().toLowerCase(); const token=(u.searchParams.get('token')||'').trim();
  if(!orderNumber || (!email && !token)) return NextResponse.json({error:'Order number and email are required.'},{status:400});
  const o=await queryOne<Record<string, any>>(`SELECT id,order_number,customer_name,customer_email,delivery_method,delivery_fee,advance_percent,delivery_estimate,subtotal,total,payment_method,payment_status,order_status,created_at,updated_at,shipping_address,tracking_token FROM orders WHERE order_number=$1 AND deleted_at IS NULL`,[orderNumber]);
  if(!o) return NextResponse.json({error:'Order not found.'},{status:404});
  const authorized=token ? token===o.tracking_token : email===String(o.customer_email).toLowerCase();
  if(!authorized) return NextResponse.json({error:'The order number or email does not match our records.'},{status:403});
  const items=await query(`SELECT product_slug,product_name,unit_price,quantity,line_total,advance_amount,delivery_region,delivery_time FROM order_items WHERE order_id=$1 ORDER BY id`,[o.id]);
  const history=await query(`SELECT status,note,created_at FROM order_status_history WHERE order_id=$1 ORDER BY created_at ASC,id ASC`,[o.id]);
  const siteContent=await getHomepageContent();
  const bankDetails={bankName:siteContent.bankName,bankAccountNumber:siteContent.bankAccountNumber,bankBeneficiary:siteContent.bankBeneficiary};
  return NextResponse.json({...o,shipping_address:parseJson(o.shipping_address,{}),tracking_token:undefined,bankDetails,items,history},{headers:{'Cache-Control':'no-store'}});
}
