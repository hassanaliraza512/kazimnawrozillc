import { NextResponse, type NextRequest } from 'next/server';
export function middleware(request:NextRequest){if(!request.nextUrl.pathname.startsWith('/admin')||request.nextUrl.pathname==='/admin/login')return NextResponse.next();if(!request.cookies.get('kn_admin')?.value)return NextResponse.redirect(new URL('/admin/login',request.url));return NextResponse.next();}
export const config={matcher:['/admin/:path*']};
