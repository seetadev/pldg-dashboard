import { useState, useEffect } from "react";
import { EngagementData } from "@/types/dashboard";

export function useCSVData() {
  const [data, setData] = useState<EngagementData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [timestamp, setTimestamp] = useState<number>(0);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      console.log("Fetching engagement data from API...");
      const response = await fetch("/api/engagement-data");

      if (!response.ok) {
        throw new Error("Failed to fetch data: " + response.statusText);
      }

      const engagementData = await response.json();
      console.log("API data received:", {
        rows: engagementData.length,
        sampleData: engagementData[0],
      });

      setData(engagementData);
      setIsLoading(false);
      setTimestamp(Date.now());
    } catch (error) {
      console.error("Error loading data:", error);
      setIsError(true);
      setIsLoading(false);
    }
  }

  const mutate = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      console.log("Manually refreshing engagement data...");
      const response = await fetch("/api/engagement-data");

      if (!response.ok) {
        throw new Error("Failed to fetch data: " + response.statusText);
      }

      const engagementData = await response.json();
      console.log("Data refresh complete:", {
        rows: engagementData.length,
        sampleData: engagementData[0],
      });

      setData(engagementData);
      setIsLoading(false);
      setTimestamp(Date.now());
    } catch (error) {
      console.error("Error refreshing data:", error);
      setIsError(true);
      setIsLoading(false);
    }
  };

  return {
    data,
    isLoading,
    isError,
    mutate,
    timestamp,
  };
}
