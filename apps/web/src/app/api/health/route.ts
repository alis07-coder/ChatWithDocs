import { getEnvStatus } from "@chatwithdocs/core";
import { connection } from "next/server";

// GET /api/health
// Shows which services have their environment variables set.
// Only variable names and problems are returned, never the values.
export async function GET() {
  // Read env at request time, not when the app is built.
  await connection();

  const services = getEnvStatus();
  return Response.json({
    ok: services.every((service) => service.configured),
    services,
  });
}
