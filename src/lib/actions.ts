"use server";

import { ProcessedData, TechnicalProgress } from "@/types/dashboard";
import ExcelJS from "exceljs";

export async function exportDashboardAction(data: ProcessedData) {
  try {
    if (!data) {
      throw new Error("No data provided for export");
    }

    const workbook = new ExcelJS.Workbook();

    // Overview Sheet
    const overviewSheet = workbook.addWorksheet("Overview");
    overviewSheet.addRow(["PLDG Developer Engagement Dashboard"]);
    overviewSheet.addRow(["Generated:", new Date().toLocaleString()]);
    overviewSheet.addRow([]);

    // Program Health
    overviewSheet.addRow(["Program Health"]);
    overviewSheet.addRow(["Metric", "Value"]);
    overviewSheet.addRow(["Active Contributors", data.activeContributors]);
    overviewSheet.addRow(["Total Contributions", data.totalContributions]);
    overviewSheet.addRow(["NPS Score", data.programHealth.npsScore]);
    overviewSheet.addRow([
      "Engagement Rate",
      `${data.programHealth.engagementRate}%`,
    ]);
    overviewSheet.addRow([
      "Active Tech Partners",
      data.programHealth.activeTechPartners,
    ]);
    overviewSheet.addRow([]);

    // Engagement Trends Sheet
    const trendsSheet = workbook.addWorksheet("Engagement Trends");
    trendsSheet.addRow([
      "Week",
      "High Engagement",
      "Medium Engagement",
      "Low Engagement",
      "Total",
    ]);
    data.engagementTrends.forEach((trend) => {
      trendsSheet.addRow([
        trend.week,
        trend["High Engagement"],
        trend["Medium Engagement"],
        trend["Low Engagement"],
        trend.total,
      ]);
    });

    // Technical Progress Sheet
    const progressSheet = workbook.addWorksheet("Technical Progress");
    progressSheet.addRow(["Week", "Total Issues"]);
    data.technicalProgress.forEach((progress: TechnicalProgress) => {
      progressSheet.addRow([progress.week, progress["Total Issues"]]);
    });

    // Tech Partners Sheet
    const partnersSheet = workbook.addWorksheet("Tech Partners");
    partnersSheet.addRow([
      "Partner",
      "Total Issues",
      "Active Contributors",
      "Avg Issues/Contributor",
    ]);
    data.techPartnerMetrics.forEach((partner) => {
      partnersSheet.addRow([
        partner.partner,
        partner.totalIssues,
        partner.activeContributors,
        partner.avgIssuesPerContributor,
      ]);
    });

    // Top Performers Sheet
    const performersSheet = workbook.addWorksheet("Top Performers");
    performersSheet.addRow(["Name", "Total Issues", "Average Engagement"]);
    data.topPerformers.forEach((performer) => {
      performersSheet.addRow([
        performer.name,
        performer.totalIssues,
        performer.avgEngagement,
      ]);
    });

    // Action Items Sheet
    const actionsSheet = workbook.addWorksheet("Action Items");
    actionsSheet.addRow(["Type", "Title", "Description", "Recommended Action"]);
    data.actionItems.forEach((item) => {
      actionsSheet.addRow([
        item.type,
        item.title,
        item.description,
        item.action,
      ]);
    });

    // Style the workbook
    workbook.eachSheet((sheet) => {
      sheet.getRow(1).font = { bold: true };
      sheet.columns.forEach((column) => {
        column.width = 20;
      });
    });

    // Add validation before buffer creation
    if (!workbook.worksheets.length) {
      throw new Error("No worksheets created");
    }

    // Generate buffer with error handling
    let buffer: Buffer;
    try {
      buffer = (await workbook.xlsx.writeBuffer()) as Buffer;
    } catch (bufferError) {
      console.error("Buffer creation failed:", bufferError);
      throw new Error("Failed to generate Excel file");
    }

    // Validate buffer
    if (!buffer || buffer.length === 0) {
      throw new Error("Generated buffer is empty");
    }

    // Convert buffer to base64 with validation
    const base64 = Buffer.from(buffer).toString("base64");
    if (!base64) {
      throw new Error("Base64 conversion failed");
    }

    return {
      success: true,
      data: base64,
      filename: `PLDG_Dashboard_${new Date().toISOString().split("T")[0]}.xlsx`,
    };
  } catch (error) {
    console.error("Export failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
