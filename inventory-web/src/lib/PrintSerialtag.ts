import JsBarcode from "jsbarcode";

export type SerialTag = {
  serialNumber: string;
  itemName: string;
  model?: string | null;
  sku?: string | null;
};

export function printSerialTags(tags: SerialTag[]): boolean {
  if (tags.length === 0) return false;
  const printWindow = window.open("", "_blank", "width=850,height=1050");
  if (!printWindow) return false;

  printWindow.document.write(`<!doctype html>
<html><head><meta charset="utf-8"><title>Serial Tags</title>
<style>
  @page { margin: 8mm; }
  body { margin: 0; font-family: Arial, sans-serif; }
  .sheet { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8mm; }
  .tag { border: 1px solid #222; padding: 8mm 5mm; text-align: center; break-inside: avoid; }
  .name { font-weight: 700; font-size: 13px; margin-bottom: 3px; }
  .model { font-size: 11px; margin-bottom: 5px; }
  svg { max-width: 100%; height: auto; }
</style></head><body><div class="sheet">
${tags.map((tag, index) => `<section class="tag"><div class="name">${escapeHtml(tag.itemName)}</div>${tag.model ? `<div class="model">${escapeHtml(tag.model)}</div>` : ""}<svg id="serial-${index}"></svg><div>${escapeHtml(tag.serialNumber)}</div>${tag.sku ? `<small>SKU: ${escapeHtml(tag.sku)}</small>` : ""}</section>`).join("")}
</div></body></html>`);
  printWindow.document.close();
  tags.forEach((tag, index) => {
    const element = printWindow.document.getElementById(`serial-${index}`);
    if (element) JsBarcode(element, tag.serialNumber, { format: "CODE128", displayValue: false, height: 45, margin: 4 });
  });
  printWindow.focus();
  printWindow.print();
  return true;
}

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
