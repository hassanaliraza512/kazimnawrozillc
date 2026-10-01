import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { getDb } from './db';

export const ADMIN_COOKIE='kn_admin';
export const PERMISSIONS=['store','inventory','orders','categories','analytics','settings','delivery','policies','users'] as const;
export type Permission=typeof PERMISSIONS[number];
export type Session={username:string; role:'admin'|'manager'; userId?:number; permissions:Permission[]};

function envToken(){const email=process.env.ADMIN_EMAIL||'admin@kazimnawrozi.com';const password=process.env.ADMIN_PASSWORD||'change-this-password';const secret=process.env.ADMIN_SESSION_SECRET||'change-this-session-secret';return createHash('sha256').update(`${email}:${password}:${secret}`).digest('hex')}
export function adminToken(){return `admin:${envToken()}`}
export function hashPassword(password:string){const salt=randomBytes(16).toString('hex');const hash=scryptSync(password,salt,64).toString('hex');return `${salt}:${hash}`}
export function verifyPassword(password:string,stored:string){try{const [salt,hash]=stored.split(':');const a=scryptSync(password,salt,64);const b=Buffer.from(hash,'hex');return a.length===b.length&&timingSafeEqual(a,b)}catch{return false}}
function userToken(u:any){const secret=process.env.ADMIN_SESSION_SECRET||'change-this-session-secret';return `user:${u.id}:${createHash('sha256').update(`${u.id}:${u.password_hash}:${secret}`).digest('hex')}`}

export function authenticateUser(username:string,password:string){
  const envEmail=process.env.ADMIN_EMAIL||'admin@kazimnawrozi.com';
  const envPassword=process.env.ADMIN_PASSWORD||'change-this-password';
  if(username===envEmail&&password===envPassword)return {token:adminToken(),session:{username,role:'admin' as const,permissions:[...PERMISSIONS] as Permission[]}};
  const db=getDb();
  const u=db.prepare('SELECT * FROM admin_users WHERE username=? AND active=1').get(username.trim()) as any;
  if(!u||!verifyPassword(password,u.password_hash))return null;
  db.prepare('UPDATE admin_users SET last_login_at=?,updated_at=? WHERE id=?').run(new Date().toISOString(),new Date().toISOString(),u.id);
  db.prepare('INSERT INTO audit_logs(actor_type,actor_id,actor_username,action,entity_type,entity_id,details) VALUES(?,?,?,?,?,?,?)').run('staff',u.id,u.username,'LOGIN','admin_user',u.id,JSON.stringify({}));
  return {token:userToken(u),session:{username:u.username,role:'manager' as const,userId:u.id,permissions:JSON.parse(u.permissions||'[]')}};
}
export async function getSession():Promise<Session|null>{
  const token=(await cookies()).get(ADMIN_COOKIE)?.value;if(!token)return null;
  if(token===adminToken())return {username:process.env.ADMIN_EMAIL||'admin@kazimnawrozi.com',role:'admin',permissions:[...PERMISSIONS]};
  if(!token.startsWith('user:'))return null;
  const [,id,sig]=token.split(':');const db=getDb();const u=db.prepare('SELECT * FROM admin_users WHERE id=? AND active=1').get(Number(id)) as any;if(!u)return null;if(userToken(u)!==token)return null;
  return {username:u.username,role:'manager',userId:u.id,permissions:JSON.parse(u.permissions||'[]')};
}
export async function isAdmin(){return !!(await getSession())}
export async function requirePermission(permission:Permission){const s=await getSession();return s&&s.permissions.includes(permission)?s:null}
