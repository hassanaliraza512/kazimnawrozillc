import { NextResponse } from "next/server";
import { queryOne } from "@/lib/postgres";
import { requirePermission } from "@/lib/auth";

export async function GET() {
  if (!(await requirePermission("analytics"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const stats = await queryOne<{
    products: string;
    available: string;
    sold: string;
    low_stock: string;
    orders: string;
    pending: string;
    paid: string;
    revenue: string;
    cod_outstanding: string;
  }>(
    `SELECT
      (SELECT COUNT(*) FROM products) AS products,
      (SELECT COUNT(*) FROM products WHERE sold=0 AND stock>0) AS available,
      (SELECT COUNT(*) FROM products WHERE sold=1 OR stock<=0) AS sold,
      (SELECT COUNT(*) FROM products WHERE sold=0 AND stock>0 AND stock<=3) AS low_stock,
      COUNT(*) AS orders,
      COUNT(*) FILTER (WHERE payment_status='cod_pending') AS pending,
      COUNT(*) FILTER (WHERE payment_status='paid') AS paid,
      COALESCE(SUM(total) FILTER (WHERE payment_status='paid'),0) AS revenue,
      COALESCE(SUM(total) FILTER (WHERE payment_status='cod_pending'),0) AS cod_outstanding
     FROM orders
     WHERE deleted_at IS NULL`,
  );

  if (!stats) {
    throw new Error("Unable to calculate dashboard statistics.");
  }

  return NextResponse.json({
    products: Number(stats.products),
    available: Number(stats.available),
    sold: Number(stats.sold),
    lowStock: Number(stats.low_stock),
    orders: Number(stats.orders),
    pending: Number(stats.pending),
    paid: Number(stats.paid),
    revenue: Number(stats.revenue),
    codOutstanding: Number(stats.cod_outstanding),
  });
}
