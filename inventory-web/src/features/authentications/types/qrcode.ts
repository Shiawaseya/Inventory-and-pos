export type QRCodeGenerateRequest = {
  role: "supervisor" | "inventory_clerk" | "cashier";
  branch_id?: number;
  expires_at?: string;
  referred_by?: string;
  code?: string;
}

export type QRCodeData = {
  id: string;
  code: string;
  role: "supervisor" | "inventory_clerk" | "cashier";
  branch_id: string;
  referred_by: string | null;
  team_onboarding_id: string | null;
  created_by_employee_id: string | null;
  created_at: string;
  expires_at: string | null;
  used_at: string | null;
  status: "active" | "expired" | "used";
}

export type QRCodeGenerateResponse = {
  success: boolean;
  message: string;
  data?: QRCodeData;
  error?: string;
}

export type QRCodeVerifyRequest = {
  code: string;
}

export type QRCodeVerifyResponse = {
  success: boolean;
  message: string;
  data?: QRCodeData;
}
