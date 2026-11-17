export type BrandRecordedBy = {
  id: number;
  name: string;
};

export type Brand = {
  brand_id: number;
  name: string;
  is_active: boolean;
  recorded_by: BrandRecordedBy;
  created_at: string;
};

export type BrandApiResponse = {
  success: boolean;
  data: Brand[];
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
};
