import { NextResponse } from "next/server";
import { cache } from "@/lib/cache";

export async function POST() {
  try {
    console.log("Refreshing Airtable data...");

    // Clear the cache
    cache.delete("airtable_data");

    // Fetch fresh data
    const response = await fetch(
      `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Weekly Engagement Survey`,
      {
        headers: {
          Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Airtable API error: ${response.statusText}`);
    }

    const data = await response.json();

    cache.set(
      "airtable_data",
      JSON.stringify({
        data: data.records,
        timestamp: Date.now(),
      }),
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Airtable refresh error:", error);
    return NextResponse.json(
      { error: "Failed to refresh Airtable data" },
      { status: 500 },
    );
  }
}
