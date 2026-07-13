import { apiOk } from "@/lib/api/response";
import { connectToDatabase } from "@/lib/db/mongoose";

export async function GET() {
  try {
    await connectToDatabase();
    return apiOk({
      status: "ok",
      database: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Health check database connection failed", {
      name: error instanceof Error ? error.name : "UnknownError",
      message: error instanceof Error ? error.message : "Unknown error",
    });

    return Response.json(
      {
        success: false,
        data: {
          status: "degraded",
          database: "unavailable",
          timestamp: new Date().toISOString(),
        },
      },
      { status: 503 },
    );
  }
}
