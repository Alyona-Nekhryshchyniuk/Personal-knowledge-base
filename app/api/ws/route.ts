export async function GET() {
  return new Response('WebSocket endpoint available at /api/ws', {
    headers: { 'Content-Type': 'application/json' },
  });
}
