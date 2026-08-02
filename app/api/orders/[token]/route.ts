import type { NextRequest } from "next/server";
import { cancelOrderByToken, getOrderByToken } from "@/lib/queries";

/**
 * The token is the customer's only credential, so responses must never leak
 * anything beyond their own order — no merchant internals, no other customers.
 * `no-store` because an order's status changes while the page is open.
 */
const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(
  _request: NextRequest,
  ctx: RouteContext<"/api/orders/[token]">,
) {
  const { token } = await ctx.params;
  const order = await getOrderByToken(token);

  if (!order) {
    return Response.json(
      { error: "Not found" },
      { status: 404, headers: NO_STORE },
    );
  }

  return Response.json({ order }, { headers: NO_STORE });
}

/** Lets a customer withdraw an order the shop hasn't confirmed yet. */
export async function POST(
  _request: NextRequest,
  ctx: RouteContext<"/api/orders/[token]">,
) {
  const { token } = await ctx.params;
  const cancelled = await cancelOrderByToken(token);

  if (!cancelled) {
    const existing = await getOrderByToken(token);
    if (!existing) {
      return Response.json(
        { error: "Not found" },
        { status: 404, headers: NO_STORE },
      );
    }
    return Response.json(
      {
        error: "too_late",
        message: "The shop has already started on this order.",
        order: existing,
      },
      { status: 409, headers: NO_STORE },
    );
  }

  return Response.json({ order: cancelled }, { headers: NO_STORE });
}
