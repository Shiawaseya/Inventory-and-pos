export type TeamOnboardingRecord = {
  team_onboarding_id: number;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  full_name: string;
  username: string;
  branch_id: number;
  approved_by_employee_id: number | null;
  created_at: string;
  qrcode_id: number;
  qr_code: string;
  role: string;
  qr_status: string;
  referred_by: string | null;
  created_by_employee_id: number;
  used_at: string | null;
  expires_at: string | null;
};

export type TeamOnboardingResponse = {
  success: boolean;
  data: TeamOnboardingRecord[];
};
