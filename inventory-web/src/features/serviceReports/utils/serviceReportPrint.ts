import type { ServiceReport } from "../types/serviceReport";

export function printServiceReport(report: ServiceReport): void {
  const printWindow = window.open("", "_blank", "width=850,height=1050");
  if (!printWindow) return;

  printWindow.document.write(buildPrintableReport(report));
  printWindow.document.close();
  printWindow.focus();
}

function escapeHtml(value?: string | null): string {
  if (!value) return "";
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function buildPrintableReport(report: ServiceReport): string {
  const customer = report.customer;
  const unit = report.unit;
  const invoice = report.invoice;

  // Render up to 10 rows in the UPDATE table to preserve physical memo spacing
  const actions = report.actions || [];
  const totalRows = Math.max(actions.length, 10);
  const actionRowsHtml = Array.from({ length: totalRows })
    .map((_, index) => {
      const act = actions[index];
      const dateText = act ? escapeHtml(act.action_date) : "&nbsp;";
      const descText = act
        ? `${escapeHtml(act.action_taken)}${act.logged_by ? ` <span class="logged-by">(${escapeHtml(act.logged_by)})</span>` : ""}`
        : "&nbsp;";

      return `
        <tr>
          <td class="col-date">${dateText}</td>
          <td class="col-action">${descText}</td>
        </tr>
      `;
    })
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Branch Service Report - ${escapeHtml(report.control_number)}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 14mm 16mm;
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    body {
      margin: 0;
      padding: 24px;
      font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
      color: #000;
      background: #fff;
      font-size: 13px;
      line-height: 1.35;
    }

    .memo-container {
      max-width: 780px;
      margin: 0 auto;
    }

    /* Memo Header */
    .memo-title {
      text-align: center;
      font-size: 15px;
      font-weight: bold;
      letter-spacing: 1.5px;
      margin-bottom: 22px;
      text-transform: uppercase;
    }

    .header-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      column-gap: 24px;
      row-gap: 12px;
      margin-bottom: 24px;
    }

    .report-heading {
      text-align: center;
      font-size: 13px;
      font-weight: bold;
      letter-spacing: 1px;
      margin: 20px 0 16px 0;
      text-transform: uppercase;
    }

    /* Form Rows with Solid Underlines */
    .form-line {
      display: flex;
      align-items: flex-end;
      margin-bottom: 8px;
      font-size: 12.5px;
    }

    .label {
      font-weight: bold;
      white-space: nowrap;
      text-transform: uppercase;
      font-size: 11.5px;
      letter-spacing: 0.3px;
    }

    .field-value {
      flex: 1;
      border-bottom: 1.2px solid #000;
      padding: 0 6px 1px 6px;
      min-height: 18px;
      font-size: 13px;
      font-family: Arial, sans-serif;
      text-transform: uppercase;
    }

    .inline-split {
      display: flex;
      gap: 16px;
      width: 100%;
    }

    .flex-1 { flex: 1; }
    .flex-2 { flex: 2; }

    /* Update / Action Taken Table */
    .update-section {
      margin-top: 18px;
    }

    .update-header-title {
      font-weight: bold;
      font-size: 12px;
      text-transform: uppercase;
      margin-bottom: 6px;
    }

    .update-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 4px;
    }

    .update-table th {
      text-align: left;
      font-size: 11.5px;
      font-weight: bold;
      text-transform: uppercase;
      padding: 4px 6px;
      border-bottom: 1.2px solid #000;
    }

    .update-table td {
      border-bottom: 1px solid #222;
      padding: 5px 6px;
      font-size: 12px;
      min-height: 22px;
      height: 22px;
      vertical-align: bottom;
    }

    .col-date {
      width: 130px;
      font-family: Arial, sans-serif;
    }

    .col-action {
      font-family: Arial, sans-serif;
    }

    .logged-by {
      font-size: 10.5px;
      color: #333;
      text-transform: none;
    }

    /* Bottom Signatures */
    .signatures-grid {
      display: flex;
      justify-content: space-between;
      margin-top: 48px;
      padding: 0 10px;
    }

    .signature-box {
      width: 250px;
      text-align: center;
    }

    .sig-line {
      border-bottom: 1.2px solid #000;
      height: 26px;
      margin-bottom: 4px;
      font-weight: bold;
      font-size: 12.5px;
      text-transform: uppercase;
      display: flex;
      align-items: flex-end;
      justify-content: center;
    }

    .sig-label {
      font-size: 11.5px;
      font-weight: bold;
    }

    .sig-sub {
      font-size: 10.5px;
      font-style: italic;
      color: #222;
    }

    @media print {
      body {
        padding: 0;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="memo-container">
    <div class="memo-title">Inter-Office Memo</div>

    <div class="header-grid">
      <div class="form-line">
        <span class="label">To:</span>
        <span class="field-value">${escapeHtml(report.report_to || "SERVICE DEPARTMENT / ASC")}</span>
      </div>
      <div class="form-line">
        <span class="label">Date:</span>
        <span class="field-value">${escapeHtml(report.reported_date)}</span>
      </div>
      <div class="form-line" style="grid-column: span 2;">
        <span class="label">From:</span>
        <span class="field-value">BRANCH SERVICE DESK</span>
      </div>
    </div>

    <div class="report-heading">Branch Service Report</div>

    <!-- Intake Fields -->
    <div class="form-line">
      <span class="label">Date Complain:</span>
      <span class="field-value">${escapeHtml(report.reported_date)}</span>
    </div>

    <div class="form-line">
      <span class="label">Customer's Name:</span>
      <span class="field-value">${escapeHtml(customer?.name || "")}</span>
    </div>

    <div class="form-line">
      <span class="label">Address:</span>
      <span class="field-value">${escapeHtml(customer?.address || "")}</span>
    </div>

    <div class="form-line">
      <span class="label">Contact Number:</span>
      <span class="field-value">${escapeHtml(customer?.contact_number || "")}</span>
    </div>

    <div class="form-line">
      <span class="label">Brand:</span>
      <span class="field-value">${escapeHtml(unit?.brand || "")}</span>
    </div>

    <div class="inline-split">
      <div class="form-line flex-1">
        <span class="label">Model:</span>
        <span class="field-value">${escapeHtml(unit?.model || "")}</span>
      </div>
      <div class="form-line flex-1">
        <span class="label">Serial Number:</span>
        <span class="field-value">${escapeHtml(unit?.serial_number || "")}</span>
      </div>
    </div>

    <div class="inline-split">
      <div class="form-line flex-1">
        <span class="label">Date of Purchase:</span>
        <span class="field-value">${escapeHtml(invoice?.date_of_purchase || "")}</span>
      </div>
      <div class="form-line flex-1">
        <span class="label">DR/SI No.:</span>
        <span class="field-value">${escapeHtml(invoice?.invoice_number || "")}</span>
      </div>
    </div>

    <div class="form-line">
      <span class="label">Complain:</span>
      <span class="field-value" style="font-weight: 600;">${escapeHtml(report.complaint_description)}</span>
    </div>

    <div class="inline-split">
      <div class="form-line flex-1">
        <span class="label">Reported Date:</span>
        <span class="field-value">${escapeHtml(report.reported_date)}</span>
      </div>
      <div class="form-line flex-1">
        <span class="label">Control No.:</span>
        <span class="field-value" style="font-weight: bold;">${escapeHtml(report.control_number)}</span>
      </div>
    </div>

    <div class="inline-split">
      <div class="form-line flex-1">
        <span class="label">Report To:</span>
        <span class="field-value">${escapeHtml(report.report_to || "")}</span>
      </div>
      <div class="form-line flex-1">
        <span class="label">ASC:</span>
        <span class="field-value">${escapeHtml(report.asc_name || "")}</span>
      </div>
    </div>

    <!-- Running Update Table -->
    <div class="update-section">
      <div class="update-header-title">Update:</div>
      <table class="update-table">
        <thead>
          <tr>
            <th class="col-date">Date</th>
            <th class="col-action">Action Taken</th>
          </tr>
        </thead>
        <tbody>
          ${actionRowsHtml}
        </tbody>
      </table>
    </div>

    <!-- Sign-off Block -->
    <div class="signatures-grid">
      <div class="signature-box">
        <span class="sig-label">Prepared by:</span>
        <div class="sig-line">${escapeHtml(report.prepared_by?.name || "")}</div>
        <div class="sig-sub">(Branch Service Custodian)</div>
      </div>

      <div class="signature-box">
        <span class="sig-label">Certified by:</span>
        <div class="sig-line">${escapeHtml(report.certified_by?.name || "")}</div>
        <div class="sig-sub">(Sales/C&amp;C supervisor)</div>
      </div>
    </div>
  </div>

  <script>
    window.onload = function() {
      window.print();
    };
  </script>
</body>
</html>`;
}
