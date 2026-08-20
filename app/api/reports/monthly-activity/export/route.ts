import ExcelJS from "exceljs";
import { requirePermission } from "@/lib/dal";
import { writeAuditLog } from "@/lib/audit";
import { getMonthlyActivityReport } from "@/lib/data/monthly-activity-report";
import { formatDate } from "@/lib/format";

export async function POST(request: Request) {
  const session = await requirePermission("EXPORT_REPORTS");
  // proxy.ts's MFA-enrollment redirect never runs for /api routes — see
  // app/api/documents/[id]/route.ts's matching comment.
  if (!session.mfaEnabled) return new Response("MFA setup required", { status: 403 });
  const formData = await request.formData();

  const startRaw = formData.get("startDate");
  const endRaw = formData.get("endDate");
  if (typeof startRaw !== "string" || typeof endRaw !== "string" || !startRaw || !endRaw) {
    return new Response("Start date and end date are required.", { status: 400 });
  }
  const startDate = new Date(startRaw);
  const endDate = new Date(endRaw);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || startDate > endDate) {
    return new Response("Invalid date range.", { status: 400 });
  }

  const { detailRows, summaryRows } = await getMonthlyActivityReport(startDate, endDate);

  const workbook = new ExcelJS.Workbook();

  const detailSheet = workbook.addWorksheet("Monthly Activity");
  detailSheet.columns = [
    { header: "First Name", key: "firstName", width: 16 },
    { header: "Last Name", key: "lastName", width: 16 },
    { header: "Medicaid ID", key: "medicaidId", width: 16 },
    { header: "First HRA Date", key: "firstHraDate", width: 16 },
    { header: "First CNA Date", key: "firstCnaDate", width: 16 },
    { header: "First CCP Date", key: "firstCcpDate", width: 16 },
    { header: "Touchpoints in Range", key: "touchpoints", width: 18 },
    { header: "Termed Date", key: "termedDate", width: 16 },
  ];
  detailSheet.getRow(1).font = { bold: true };
  for (const r of detailRows) {
    detailSheet.addRow({
      firstName: r.firstName,
      lastName: r.lastName,
      medicaidId: r.medicaidId ?? "",
      firstHraDate: r.firstHraDate ? formatDate(r.firstHraDate) : "",
      firstCnaDate: r.firstCnaDate ? formatDate(r.firstCnaDate) : "",
      firstCcpDate: r.firstCcpDate ? formatDate(r.firstCcpDate) : "",
      touchpoints: r.touchpointsInRange,
      termedDate: r.termedDate ? formatDate(r.termedDate) : "",
    });
  }

  const summarySheet = workbook.addWorksheet("Monthly Summary");
  summarySheet.columns = [
    { header: "Month", key: "month", width: 18 },
    { header: "Total Touchpoints", key: "totalTouchpoints", width: 18 },
    { header: "CCPs Created", key: "ccpsCreated", width: 16 },
    { header: "Enrollments Completed", key: "enrollmentsCompleted", width: 20 },
    { header: "Members Termed", key: "membersTermed", width: 16 },
  ];
  summarySheet.getRow(1).font = { bold: true };
  for (const r of summaryRows) {
    summarySheet.addRow(r);
  }

  await writeAuditLog({
    userId: session.userId,
    action: "EXPORT",
    resource: "MonthlyActivityReport",
    metadata: {
      startDate: startRaw,
      endDate: endRaw,
      memberCount: detailRows.length,
      memberIds: detailRows.map((r) => r.id),
    },
  });

  const buffer = await workbook.xlsx.writeBuffer();

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="monthly-activity-${startRaw}-to-${endRaw}.xlsx"`,
    },
  });
}
