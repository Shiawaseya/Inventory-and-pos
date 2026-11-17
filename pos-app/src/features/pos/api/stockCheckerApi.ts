import { loginApi } from "@/features/authentications/api/loginApi";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type SpecDataType = "numeric" | "option" | "text";

export type FacetUnit = {
  unit_id: number | null;
  symbol: string | null;
  min: number;
  max: number;
};

export type FacetAttribute =
  | {
      attribute_id: number;
      name: string;
      data_type: "numeric";
      units: FacetUnit[];
    }
  | {
      attribute_id: number;
      name: string;
      data_type: "option";
      options: { option_id: number; value: string; count: number }[];
    }
  | { attribute_id: number; name: string; data_type: "text" };

export type StockFacets = {
  categories: { category_id: number; name: string; variant_count: number }[];
  price: { min: number; max: number };
  attributes: FacetAttribute[];
};

export type VariantSpec = {
  attribute_id: number;
  name: string;
  data_type: SpecDataType;
  value: string | null;
  unit: string | null;
};

export type StockVariant = {
  variant_id: number;
  item_id: number;
  item_name: string;
  model: string | null;
  sku: string | null;
  image_url: string | null;
  brand: string | null;
  category: string | null;
  is_serialized: boolean;
  price: number;
  available_count: number;
  specs: VariantSpec[];
};

/** UI state for one attribute's filter. Values stay strings so inputs can be empty. */
export type SpecFilterState = {
  min?: string;
  max?: string;
  unit_id?: number | null;
  option_ids?: number[];
  text?: string;
};

export type StockSearchParams = {
  branchId: number;
  search?: string;
  categoryId?: number;
  priceMin?: string;
  priceMax?: string;
  inStock?: boolean;
  sort?: "name" | "price_asc" | "price_desc" | "stock_desc";
  specs: Record<number, SpecFilterState>;
  page?: number;
  perPage?: number;
};

/* ------------------------------------------------------------------ */
/* HTTP adapter — swap this for the axios/fetch client you already use  */
/* for branchInventoryItemApi so auth headers + base URL match.        */
/* ------------------------------------------------------------------ */

async function get<T>(path: string, params: URLSearchParams): Promise<T> {
  const base = import.meta.env.VITE_API_URL ?? "";
  const token = (loginApi as any).getToken?.() ?? localStorage.getItem("token");
  const res = await fetch(`${base}${path}?${params.toString()}`, {
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.success === false) {
    throw new Error(json?.message ?? "Request failed");
  }
  return json as T;
}

/* ------------------------------------------------------------------ */
/* Query building                                                      */
/* ------------------------------------------------------------------ */

/** True when a spec filter would actually narrow results. */
export function isSpecActive(s?: SpecFilterState) {
  return (
    !!s && (!!s.min || !!s.max || !!s.text?.trim() || !!s.option_ids?.length)
  );
}

function buildParams(p: StockSearchParams): URLSearchParams {
  const q = new URLSearchParams();
  q.set("branch_id", String(p.branchId));
  if (p.search?.trim()) q.set("search", p.search.trim());
  if (p.categoryId) q.set("category_id", String(p.categoryId));
  if (p.priceMin) q.set("price_min", p.priceMin);
  if (p.priceMax) q.set("price_max", p.priceMax);
  if (p.inStock) q.set("in_stock", "1");
  if (p.sort) q.set("sort", p.sort);
  q.set("page", String(p.page ?? 1));
  q.set("per_page", String(p.perPage ?? 24));

  for (const [id, s] of Object.entries(p.specs)) {
    if (!isSpecActive(s)) continue;
    if (s.min) q.set(`specs[${id}][min]`, s.min);
    if (s.max) q.set(`specs[${id}][max]`, s.max);
    if ((s.min || s.max) && s.unit_id != null)
      q.set(`specs[${id}][unit_id]`, String(s.unit_id));
    if (s.option_ids?.length)
      q.set(`specs[${id}][option_ids]`, s.option_ids.join(","));
    if (s.text?.trim()) q.set(`specs[${id}][text]`, s.text.trim());
  }
  return q;
}

export const stockCheckerApi = {
  facets: (branchId: number, categoryId?: number) => {
    const q = new URLSearchParams({ branch_id: String(branchId) });
    if (categoryId) q.set("category_id", String(categoryId));
    return get<{ data: StockFacets }>("/stock-checker/facets", q).then(
      (r) => r.data,
    );
  },
  variants: (params: StockSearchParams) =>
    get<{
      data: StockVariant[];
      pagination: {
        current_page: number;
        per_page: number;
        total_items: number;
        total_pages: number;
      };
    }>("/stock-checker/variants", buildParams(params)),
};
