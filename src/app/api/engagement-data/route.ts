import { NextResponse } from "next/server";
import engagementService from "@/lib/engagement-data/service";

/**
 * GET handler for fetching all engagement data records
 * @returns JSON response with engagement data or error
 */
export async function GET() {
  try {
    // Fetch all engagement data records
    const data = await engagementService.getAll();

    console.log("Engagement data fetched:", {
      recordCount: data.length,
      timestamp: new Date().toISOString(),
    });

    // Return successful response with data
    return NextResponse.json(data);
  } catch (error) {
    // Log the error for server-side debugging
    console.error("Failed to fetch engagement data:", error);

    // Return appropriate error response
    return NextResponse.json(
      { error: "Failed to fetch engagement data" },
      { status: 500 }
    );
  }
}
