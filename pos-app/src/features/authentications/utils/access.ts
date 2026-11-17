import { loginApi } from "../api/loginApi";

function normalizeRole(): string {
  return (
    loginApi.getUser()?.role?.trim().toLowerCase().replace(/[\s_]/g, "-") || ""
  );
}

export function isInventoryClerk(): boolean {
  const role = normalizeRole();
  return role === "inventory-clerk" || role === "sr-ic" || role === "sric";
}

export function isSric(): boolean {
  const role = normalizeRole();
  return role === "sr-ic" || role === "sric";
}

export function isSalesOic(): boolean {
  const role = normalizeRole();
  return role === "sales-oic";
}

export function canCertifyServiceReports(): boolean {
  const role = normalizeRole();
  return role === "supervisor" || role === "sales-oic";
}
