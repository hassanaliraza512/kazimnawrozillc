import { NextResponse } from 'next/server';
import { queryOne } from '@/lib/postgres';
export const runtime='nodejs';
export async function GET(){try{await queryOne('SELECT 1 AS ok');return NextResponse.json({ok:true,service:'kazim-nawrozi',database:'postgres',time:new Date().toISOString()},{headers:{'Cache-Control':'no-store'}})}catch(e){console.error('Health check database error:',e);return NextResponse.json({ok:false,error:'Database unavailable'},{status:503})}}
