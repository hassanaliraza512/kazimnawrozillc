import { NextResponse } from 'next/server';
import { getDb, parseJson } from '@/lib/db';
import { getHomepageContent } from '@/lib/site-content';
export const runtime='nodejs'; export const dynamic='force-dynamic';
export async function GET(req:Request){
  const u=new URL(req.url); const orderNumber=(u.searchParams.get('order')||'').trim(); const email=(u.searchParams.get('email')||'').trim().toLowerCase(); const token=(u.searchParams.get('token')||'').trim();
  if(!orderNumber || (!email && !token)) return NextResponse.json({error:'Order number and email are required.'},{status:400});
  const db=getDb(); const o=db.prepare(`SELECT id,order_number,customer_name,customer_email,delivery_method,delivery_fee,advance_percent,delivery_estimate,subtotal,total,payment_method,payment_status,order_status,created_at,updated_at,shipping_address,tracking_token FROM orders WHERE order_number=? AND deleted_at IS NULL`).get(orderNumber) as any;
  if(!o) return NextResponse.json({error:'Order not found.'},{status:404});
  const authorized=token ? token===o.tracking_token : email===String(o.customer_email).toLowerCase();
  if(!authorized) return NextResponse.json({error:'The order number or email does not match our records.'},{status:403});
  const items=db.prepare(`SELECT product_slug,product_name,unit_price,quantity,line_total,advance_amount,delivery_region,delivery_time FROM order_items WHERE order_id=? ORDER BY id`).all(o.id) as any[];
  const history=db.prepare(`SELECT status,note,created_at FROM order_status_history WHERE order_id=? ORDER BY created_at ASC,id ASC`).all(o.id) as any[];
  const siteContent=getHomepageContent();
  const bankDetails={bankName:siteContent.bankName,bankAccountNumber:siteContent.bankAccountNumber,bankBeneficiary:siteContent.bankBeneficiary};
  return NextResponse.json({...o,shipping_address:parseJson(o.shipping_address,{}),tracking_token:undefined,bankDetails,items,history},{headers:{'Cache-Control':'no-store'}});
}
