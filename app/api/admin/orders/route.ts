import { NextResponse } from 'next/server';
import { getDb, parseJson, audit } from '@/lib/db';
import { getSession, requirePermission } from '@/lib/auth';
import { sendEmailNotification, sendWhatsAppNotification, statusEmail } from '@/lib/notifications';
import { advancePercentageOptions, deliveryEstimateOptions } from '@/lib/delivery';
export const runtime='nodejs'; export const dynamic='force-dynamic';

function list(){
  const db=getDb();
  const orders=db.prepare('SELECT * FROM orders WHERE deleted_at IS NULL ORDER BY created_at DESC').all() as any[];
  return orders.map(o=>({...o,shipping_address:parseJson(o.shipping_address,{}),items:db.prepare('SELECT * FROM order_items WHERE order_id=? ORDER BY id').all(o.id),history:db.prepare('SELECT status,actor_username,note,created_at FROM order_status_history WHERE order_id=? ORDER BY created_at ASC,id ASC').all(o.id),notifications:db.prepare('SELECT kind,recipient,subject,provider,sent,error,created_at FROM notifications WHERE order_id=? ORDER BY created_at DESC').all(o.id)}));
}

export async function GET(){
  if(!(await requirePermission('orders'))) return NextResponse.json({error:'Forbidden'},{status:403});
  return NextResponse.json(list(),{headers:{'Cache-Control':'no-store'}});
}

export async function DELETE(req:Request){
  const actor=await requirePermission('orders');
  if(!actor) return NextResponse.json({error:'Forbidden'},{status:403});
  try{
    const body=await req.json();
    const id=Number(body.id);
    if(!Number.isSafeInteger(id)||id<1) return NextResponse.json({error:'Choose a valid order.'},{status:400});
    const db=getDb();
    const order=db.prepare('SELECT id,order_number FROM orders WHERE id=? AND deleted_at IS NULL').get(id) as {id:number;order_number:string}|undefined;
    if(!order) return NextResponse.json({error:'Active order not found.'},{status:404});
    const deletedAt=new Date().toISOString();
    db.prepare('UPDATE orders SET deleted_at=?,updated_at=? WHERE id=?').run(deletedAt,deletedAt,id);
    audit(actor,'ORDER_MOVED_TO_TRASH','order',id,{order_number:order.order_number});
    return NextResponse.json({ok:true});
  }catch{
    return NextResponse.json({error:'Order could not be moved to trash.'},{status:400});
  }
}

export async function PATCH(req:Request){
  const actor=await requirePermission('orders');
  if(!actor) return NextResponse.json({error:'Forbidden'},{status:403});
  const b=await req.json(); const db=getDb();
  const order=db.prepare('SELECT * FROM orders WHERE id=? AND deleted_at IS NULL').get(Number(b.id)) as any;
  if(!order) return NextResponse.json({error:'Order not found.'},{status:404});
  const allowedPayment=['terms_pending','advance_pending','advance_received','cod_pending','paid','failed','refunded'];
  const allowedStatus=['new','confirmed','processing','ready','shipped','delivered','cancelled','returned','refund_requested'];
  if(b.payment_status&&!allowedPayment.includes(b.payment_status)) return NextResponse.json({error:'Invalid payment status.'},{status:400});
  if(b.order_status&&!allowedStatus.includes(b.order_status)) return NextResponse.json({error:'Invalid order status.'},{status:400});
  const hasAdvancePercent=Object.prototype.hasOwnProperty.call(b,'advancePercent');
  const hasDeliveryEstimate=Object.prototype.hasOwnProperty.call(b,'deliveryEstimate');
  const advancePercent=hasAdvancePercent?Number(b.advancePercent):order.advance_percent;
  const deliveryEstimate=hasDeliveryEstimate?(b.deliveryEstimate==='Custom'?String(b.customDeliveryEstimate||'').trim():String(b.deliveryEstimate).trim()):String(order.delivery_estimate||'');
  if(hasAdvancePercent&&!advancePercentageOptions.includes(advancePercent as typeof advancePercentageOptions[number])&&advancePercent!==0) return NextResponse.json({error:'Choose no advance or a supported advance percentage.'},{status:400});
  if(hasDeliveryEstimate&&(!deliveryEstimate||deliveryEstimate.length>120||(b.deliveryEstimate!=='Custom'&&!deliveryEstimateOptions.includes(deliveryEstimate as typeof deliveryEstimateOptions[number])))) return NextResponse.json({error:'Choose a valid delivery estimate or enter a custom delivery time up to 120 characters.'},{status:400});
  const termsChanged=(hasAdvancePercent&&advancePercent!==order.advance_percent)||(hasDeliveryEstimate&&deliveryEstimate!==String(order.delivery_estimate||''));
  db.exec('BEGIN IMMEDIATE');
  try{
    const now=new Date().toISOString();
    if(termsChanged){const rate=order.delivery_method==='local-pickup'?0:Number(advancePercent||0);const amount=Math.round(Number(order.subtotal)*rate)/100;const paymentMethod=order.delivery_method==='local-pickup'?'cash_on_pickup':rate>0?'bank_transfer_advance_and_cash_on_delivery_balance':'cash_on_delivery';const paymentStatus=order.delivery_method==='local-pickup'||rate===0?'cod_pending':'advance_pending';db.prepare('UPDATE orders SET advance_percent=?,delivery_estimate=?,delivery_fee=?,payment_method=?,payment_status=?,updated_at=? WHERE id=?').run(rate,deliveryEstimate,amount,paymentMethod,paymentStatus,now,order.id);}
    if(typeof b.payment_status==='string') db.prepare('UPDATE orders SET payment_status=?,updated_at=? WHERE id=?').run(b.payment_status,now,order.id);
    if(typeof b.order_status==='string') { db.prepare('UPDATE orders SET order_status=?,updated_at=? WHERE id=?').run(b.order_status,now,order.id); if(b.order_status!==order.order_status){ db.prepare(`INSERT INTO order_status_history(order_id,status,actor_username,note,created_at) VALUES(?,?,?,?,?)`).run(order.id,b.order_status,actor.username,'Status updated by staff.',now); } }
    if(typeof b.notes==='string') db.prepare('UPDATE orders SET notes=?,updated_at=? WHERE id=?').run(b.notes.slice(0,5000),now,order.id);
    if(typeof b.order_status==='string' && b.order_status!==order.order_status){
      const wasRestored=['cancelled','returned'].includes(order.order_status);
      const willRestore=['cancelled','returned'].includes(b.order_status);
      const items=db.prepare('SELECT * FROM order_items WHERE order_id=?').all(order.id) as any[];
      if(!wasRestored && willRestore){
        for(const i of items) db.prepare('UPDATE products SET stock=stock+?,sold=0,updated_at=? WHERE id=?').run(i.quantity,now,i.product_id);
      } else if(wasRestored && !willRestore){
        for(const i of items){ const p=db.prepare('SELECT stock,sold,name FROM products WHERE id=?').get(i.product_id) as any; if(!p || Number(p.stock)<Number(i.quantity)) throw new Error(`${p?.name||'A product'} does not have enough stock to reactivate this order.`); db.prepare('UPDATE products SET stock=stock-?,sold=CASE WHEN stock-?<=0 THEN 1 ELSE sold END,updated_at=? WHERE id=?').run(i.quantity,i.quantity,now,i.product_id); }
      }
    }
    db.exec('COMMIT');
    audit(actor, 'ORDER_UPDATED', 'order', order.id, {order_number:order.order_number, changes:{payment_status:b.payment_status,order_status:b.order_status,notes:b.notes!==undefined}});
    const shouldNotify=termsChanged||(typeof b.payment_status==='string'&&b.payment_status!==order.payment_status)||(typeof b.order_status==='string'&&b.order_status!==order.order_status);
    let emailResult:{sent:number;error:string}|null=null;
    if(shouldNotify){const fresh=db.prepare('SELECT * FROM orders WHERE id=?').get(order.id) as any;emailResult=await sendEmailNotification({orderId:order.id,orderNumber:order.order_number,to:order.customer_email,customerName:order.customer_name,kind:'status_update',status:fresh.order_status,subject:`Kazim Nawrozi — Order ${order.order_number} details`,html:statusEmail(fresh,fresh.order_status)});}
    if(typeof b.order_status==='string'&&b.order_status!==order.order_status&&Number(order.whatsapp_opt_in)) void sendWhatsAppNotification({orderId:order.id,orderNumber:order.order_number,to:order.phone,customerName:order.customer_name,kind:'status_update',status:b.order_status,subtotal:Number(order.subtotal)});
    return NextResponse.json({ok:true,emailSent:emailResult?Boolean(emailResult.sent):null,emailError:emailResult?.error||''});
  }catch(e){db.exec('ROLLBACK');return NextResponse.json({error:e instanceof Error?e.message:'Update failed.'},{status:400})}
}
