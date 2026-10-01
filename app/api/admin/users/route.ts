import {NextResponse} from 'next/server';
import {getDb, audit} from '@/lib/db';
import {getSession,hashPassword,PERMISSIONS,Permission} from '@/lib/auth';
export const runtime='nodejs';export const dynamic='force-dynamic';
async function guard(){const s=await getSession();return s?.role==='admin'?s:null}
function safe(row:any){return {...row,permissions:JSON.parse(row.permissions||'[]')}}
export async function GET(){
  const actor=await guard(); if(!actor)return NextResponse.json({error:'Forbidden'},{status:403});
  const db=getDb();
  const rows=db.prepare('SELECT id,username,permissions,active,last_login_at,created_at,updated_at FROM admin_users ORDER BY username').all() as any[];
  const logs=db.prepare('SELECT id,actor_type,actor_id,actor_username,action,entity_type,entity_id,details,created_at FROM audit_logs ORDER BY id DESC LIMIT 200').all() as any[];
  return NextResponse.json({users:rows.map(safe),logs:logs.map(x=>({...x,details:JSON.parse(x.details||'{}')}))});
}
export async function POST(req:Request){
  const actor=await guard(); if(!actor)return NextResponse.json({error:'Forbidden'},{status:403});
  const b=await req.json(); const username=String(b.username||'').trim(); const password=String(b.password||'');
  const permissions=(Array.isArray(b.permissions)?b.permissions:[]).filter((p:any)=>PERMISSIONS.includes(p as Permission)&&p!=='users');
  if(username.length<3)return NextResponse.json({error:'Username must be at least 3 characters.'},{status:400});
  const db=getDb(); const now=new Date().toISOString(); const id=Number(b.id)||0;
  try{
    if(id){
      const old=db.prepare('SELECT username,active FROM admin_users WHERE id=?').get(id) as any;
      if(!old)return NextResponse.json({error:'User not found.'},{status:404});
      if(password && password.length<8)return NextResponse.json({error:'Password must be at least 8 characters.'},{status:400});
      if(password){db.prepare('UPDATE admin_users SET username=?,password_hash=?,permissions=?,active=?,updated_at=? WHERE id=?').run(username,hashPassword(password),JSON.stringify(permissions),b.active===false?0:1,now,id)}
      else db.prepare('UPDATE admin_users SET username=?,permissions=?,active=?,updated_at=? WHERE id=?').run(username,JSON.stringify(permissions),b.active===false?0:1,now,id);
      audit(actor,'UPDATE_USER','admin_user',id,{username,permissions,active:b.active!==false,passwordChanged:Boolean(password)});
    } else {
      if(password.length<8)return NextResponse.json({error:'Password must be at least 8 characters.'},{status:400});
      const result=db.prepare('INSERT INTO admin_users(username,password_hash,permissions,active) VALUES(?,?,?,?)').run(username,hashPassword(password),JSON.stringify(permissions),1);
      audit(actor,'CREATE_USER','admin_user',Number(result.lastInsertRowid),{username,permissions});
    }
    return NextResponse.json({ok:true});
  }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Unable to save user.'},{status:400})}
}
export async function PATCH(req:Request){
  const actor=await guard(); if(!actor)return NextResponse.json({error:'Forbidden'},{status:403});
  const b=await req.json(); const id=Number(b.id); if(!id)return NextResponse.json({error:'User ID is required.'},{status:400});
  const db=getDb(); const u=db.prepare('SELECT id,username,active FROM admin_users WHERE id=?').get(id) as any;if(!u)return NextResponse.json({error:'User not found.'},{status:404});
  const action=String(b.action||''); const now=new Date().toISOString();
  if(action==='toggle'){const active=u.active?0:1;db.prepare('UPDATE admin_users SET active=?,updated_at=? WHERE id=?').run(active,now,id);audit(actor,active?'ENABLE_USER':'DISABLE_USER','admin_user',id,{username:u.username,active:Boolean(active)});return NextResponse.json({ok:true,active});}
  if(action==='reset_password'){const temp=String(b.password||'');if(temp.length<8)return NextResponse.json({error:'Temporary password must be at least 8 characters.'},{status:400});db.prepare('UPDATE admin_users SET password_hash=?,updated_at=? WHERE id=?').run(hashPassword(temp),now,id);audit(actor,'RESET_PASSWORD','admin_user',id,{username:u.username});return NextResponse.json({ok:true});}
  return NextResponse.json({error:'Unknown action.'},{status:400});
}
export async function DELETE(req:Request){
  const actor=await guard(); if(!actor)return NextResponse.json({error:'Forbidden'},{status:403});
  const b=await req.json(); const id=Number(b.id); const db=getDb(); const u=db.prepare('SELECT username FROM admin_users WHERE id=?').get(id) as any;if(!u)return NextResponse.json({error:'User not found.'},{status:404});
  db.prepare('UPDATE admin_users SET active=0,updated_at=? WHERE id=?').run(new Date().toISOString(),id);audit(actor,'DISABLE_USER','admin_user',id,{username:u.username});return NextResponse.json({ok:true});
}
