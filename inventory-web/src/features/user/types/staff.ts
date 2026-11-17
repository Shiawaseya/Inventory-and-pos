export type StaffMember = {
  id: number | string;
  name: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  position: string;
  role_key: string;
  email: string | null;
  contact_number: string | null;
  username: string;
  is_active: number;
  created_at: string;
  deactivated_at: string | null;
  status: string;
};

export type StaffListResponse = {
  success: boolean;
  data: StaffMember[];
  message?: string;
  links?: {
    self?: string;
    first?: string;
    last?: string;
    prev?: string | null;
    next?: string | null;
  };
  pagination?: {
    total_items: number;
    total_pages: number;
    current_page: number;
    per_page: number;
  };
};
