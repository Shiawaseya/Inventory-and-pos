export type LoginCredentials = {
  username: string;
  password: string;
  rememberMe?: boolean;
}

export type ApiLoginResponse = {
  success: boolean;
  message: string;
  token: string;
  expires_in: number;
}

export type LoginResponse = {
  success: boolean;
  data?: {
    token: string;
    message: string;
    expires_in: number;
    user?: {
      employeeId: string;
      username: string;
      role: string;
      firstName: string;
      lastName: string;
      branchId: string;
      iat: number;
      exp: number;
    };
  };
  error?: {
    message: string;
    code: string;
  };
}

export type LoginError = {
  message: string;
  code: string;
  field?: string;
}

export type DecodedToken = {
  employeeId: string;
  username: string;
  role: string;
  firstName: string;
  lastName: string;
  branchId: string;
  iat: number;
  exp: number;
}
