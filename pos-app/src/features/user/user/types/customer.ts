export type CustomerAddress = {
  street_address: string | null;
  barangay: string | null;
  city_municipality: string | null;
  province: string | null;
  region: string | null;
  postal_code: string | null;
  psgc_code: string | null;
};

export type Customer = {
  customer_id: number;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  contact_number: string | null;
  email_address: string | null;
  address_id: number | null;
  address: CustomerAddress | null;
  tin: string | null;
  business_style: string | null;
  created_at: string;
};

export type CustomerListResponse = {
  success: boolean;
  data: Customer[];
  links: {
    self: string;
    first: string;
    last: string;
    prev: string | null;
    next: string | null;
  };
  pagination: {
    total_items: number;
    total_pages: number;
    current_page: number;
    per_page: number;
  };
  message?: string;
};
