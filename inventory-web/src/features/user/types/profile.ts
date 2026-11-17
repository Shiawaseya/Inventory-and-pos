export type EmployeeAddress = {
  addressId?: number | null;
  street_address?: string | null;
  barangay?: string | null;
  city_municipality?: string | null;
  province?: string | null;
  region?: string | null;
  postal_code?: string | null;
  psgc_code?: string | null;
};

export type EmployeeProfile = {
  employeeId: string | number;
  username: string;
  role: string;
  position?: string;
  name: string;
  firstName?: string;
  middleName?: string | null;
  lastName?: string;
  email?: string | null;
  contactNumber?: string | null;
  branchId?: string | number | null;
  address?: EmployeeAddress | null;
};

export type ActionType =
  "email_update" | "phone_update" | "address_update" | "pin_reset";

export type RequestOtpPayload =
  | {
      action_type: "pin_reset";
      current_password: string;
      new_value: string;
      confirm_password: string;
    }
  | {
      action_type: Exclude<ActionType, "pin_reset">;
      new_value: string | EmployeeAddress;
    };

export type VerifyOtpPayload = {
  action_type: ActionType;
  otp: string;
};

export type ApiResponse<T = unknown> = {
  success: boolean;
  message: string;
  data?: T;
};
