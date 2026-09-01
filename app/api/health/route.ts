export function GET() {
  return Response.json({ ok: true, service: "livestock-manager", time: new Date().toISOString() }, { headers: { "cache-control": "no-store" } });
}
