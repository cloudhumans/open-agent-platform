export const runtime = "nodejs";

export async function POST() {
  return new Response(
    JSON.stringify({ message: "Not found" }),
    {
      status: 404,
      headers: { "Content-Type": "application/json" },
    },
  );
}
