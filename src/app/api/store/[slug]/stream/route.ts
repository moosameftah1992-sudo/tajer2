import { orderBoard, requireStaff } from "@/lib/service";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const { tenant } = await requireStaff(slug, "orders");
  const encoder = new TextEncoder();
  let timer: ReturnType<typeof setInterval> | undefined;
  const stream = new ReadableStream({
    async start(controller) {
      const send = async () => {
        const orders = await orderBoard(tenant.id, 60);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ orders: orders.map((order) => ({ id: order.id, number: order.number, status: order.status, updatedAt: order.updatedAt, total: order.total })) })}\n\n`));
      };
      await send();
      timer = setInterval(() => {
        send().catch(() => undefined);
      }, 5000);
      request.signal.addEventListener("abort", () => {
        if (timer) clearInterval(timer);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      });
    },
    cancel() {
      if (timer) clearInterval(timer);
    },
  });
  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    },
  });
}
