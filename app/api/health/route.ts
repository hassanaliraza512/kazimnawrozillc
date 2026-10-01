import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
export const runtime='nodejs';
export async function GET(){try{const db=getDb();const row=db.prepare('SELECT 1 AS ok').get() as any;return NextResponse.json({ok:row?.ok===1,service:'kazim-nawrozi',database:'sqlite',time:new Date().toISOString()},{headers:{'Cache-Control':'no-store'}})}catch(e){return NextResponse.json({ok:false,error:e instanceof Error?e.message:'Database unavailable'},{status:503})}}
