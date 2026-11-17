import { useState, useEffect, type FormEvent, type ChangeEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  regions,
  provinces,
  cities,
  barangays,
} from "select-philippines-address";
import {
  customerApi,
  type CreateCustomerPayload,
  type CreatedCustomer,
} from "../api/customerApi";

type CreateCustomerFormProps = {
  onSuccess?: (customer: CreatedCustomer | undefined) => void;
  onCancel?: () => void;
};

const initialForm: CreateCustomerPayload = {
  first_name: "",
  middle_name: "",
  last_name: "",
  contact_number: "",
  email_address: "",
  street_address: "",
  barangay: "",
  city_municipality: "",
  province: "",
  region: "",
  postal_code: "",
  psgc_code: "",
  tin: "",
  business_style: "",
};

export function CreateCustomerForm({
  onSuccess,
  onCancel,
}: CreateCustomerFormProps) {
  const [form, setForm] = useState<CreateCustomerPayload>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Address lookup options
  const [regionList, setRegionList] = useState<any[]>([]);
  const [provinceList, setProvinceList] = useState<any[]>([]);
  const [cityList, setCityList] = useState<any[]>([]);
  const [barangayList, setBarangayList] = useState<any[]>([]);

  // Selected dropdown code tracking
  const [selectedRegionCode, setSelectedRegionCode] = useState("");
  const [selectedProvinceCode, setSelectedProvinceCode] = useState("");
  const [selectedCityCode, setSelectedCityCode] = useState("");
  const [selectedBarangayCode, setSelectedBarangayCode] = useState("");

  // Fetch regions on initial render
  useEffect(() => {
    regions().then((data: any) => {
      setRegionList(data || []);
    });
  }, []);

  const updateField = (name: keyof CreateCustomerPayload, value: string) => {
    setForm((current) => ({ ...current, [name]: value }));
  };

  // --- Address Handlers ---
  const handleRegionChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const regCode = e.target.value;
    const regObj = regionList.find((r) => r.region_code === regCode);

    setSelectedRegionCode(regCode);
    setSelectedProvinceCode("");
    setSelectedCityCode("");
    setSelectedBarangayCode("");

    setProvinceList([]);
    setCityList([]);
    setBarangayList([]);

    setForm((current) => ({
      ...current,
      region: regObj ? regObj.region_name : "",
      province: "",
      city_municipality: "",
      barangay: "",
      psgc_code: regCode,
    }));

    if (regCode) {
      provinces(regCode).then((provData: any) => {
        if (provData && provData.length > 0) {
          setProvinceList(provData);
        } else {
          // Fallback for NCR or regions without provinces
          cities(regCode).then((cityData: any) => setCityList(cityData || []));
        }
      });
    }
  };

  const handleProvinceChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const provCode = e.target.value;
    const provObj = provinceList.find((p) => p.province_code === provCode);

    setSelectedProvinceCode(provCode);
    setSelectedCityCode("");
    setSelectedBarangayCode("");

    setCityList([]);
    setBarangayList([]);

    setForm((current) => ({
      ...current,
      province: provObj ? provObj.province_name : "",
      city_municipality: "",
      barangay: "",
      psgc_code: provCode,
    }));

    if (provCode) {
      cities(provCode).then((cityData: any) => setCityList(cityData || []));
    }
  };

  const handleCityChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const cityCode = e.target.value;
    const cityObj = cityList.find((c) => c.city_code === cityCode);

    setSelectedCityCode(cityCode);
    setSelectedBarangayCode("");
    setBarangayList([]);

    setForm((current) => ({
      ...current,
      city_municipality: cityObj ? cityObj.city_name : "",
      barangay: "",
      psgc_code: cityCode,
    }));

    if (cityCode) {
      barangays(cityCode).then((brgyData: any) =>
        setBarangayList(brgyData || []),
      );
    }
  };

  const handleBarangayChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const brgyCode = e.target.value;
    const brgyObj = barangayList.find((b) => b.brgy_code === brgyCode);

    setSelectedBarangayCode(brgyCode);
    setForm((current) => ({
      ...current,
      barangay: brgyObj ? brgyObj.brgy_name : "",
      psgc_code: brgyCode, // Final PSGC barangay code
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!form.first_name.trim() || !form.last_name.trim()) {
      setError("First name and last name are required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await customerApi.create({
        ...form,
        first_name: form.first_name.trim(),
        middle_name: form.middle_name.trim(),
        last_name: form.last_name.trim(),
        contact_number: form.contact_number.trim(),
        email_address: form.email_address.trim(),
        street_address: form.street_address.trim(),
        barangay: form.barangay.trim(),
        city_municipality: form.city_municipality.trim(),
        province: form.province.trim(),
        region: form.region.trim(),
        postal_code: form.postal_code.trim(),
        psgc_code: form.psgc_code.trim(),
        tin: form.tin.trim(),
        business_style: form.business_style.trim(),
      });

      toast.success("Customer created successfully.");
      onSuccess?.(response.data);
      setForm(initialForm);
      setSelectedRegionCode("");
      setSelectedProvinceCode("");
      setSelectedCityCode("");
      setSelectedBarangayCode("");
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : "Failed to create customer.";
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectClassName =
    "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      {/* Name Fields */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="grid gap-1.5">
          <Label htmlFor="customer-first_name">First name *</Label>
          <Input
            id="customer-first_name"
            value={form.first_name}
            onChange={(e) => updateField("first_name", e.target.value)}
            required
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="customer-middle_name">Middle name</Label>
          <Input
            id="customer-middle_name"
            value={form.middle_name}
            onChange={(e) => updateField("middle_name", e.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="customer-last_name">Last name *</Label>
          <Input
            id="customer-last_name"
            value={form.last_name}
            onChange={(e) => updateField("last_name", e.target.value)}
            required
          />
        </div>
      </div>

      {/* Contact & Tax Info */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="customer-contact_number">Contact number *</Label>
          <Input
            id="customer-contact_number"
            value={form.contact_number}
            onChange={(e) => updateField("contact_number", e.target.value)}
            required
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="customer-email_address">Email address</Label>
          <Input
            id="customer-email_address"
            type="email"
            value={form.email_address}
            onChange={(e) => updateField("email_address", e.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="customer-tin">TIN</Label>
          <Input
            id="customer-tin"
            value={form.tin}
            onChange={(e) => updateField("tin", e.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="customer-business_style">Business style</Label>
          <Input
            id="customer-business_style"
            value={form.business_style}
            onChange={(e) => updateField("business_style", e.target.value)}
          />
        </div>
      </div>

      <hr className="my-1 border-border" />

      {/* Philippine Address Cascading Section */}
      <div className="grid gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="customer-street_address">
            Street / Building / Unit
          </Label>
          <Input
            id="customer-street_address"
            placeholder="e.g. Unit 402 Sunshine Tower, Boni Ave"
            value={form.street_address}
            onChange={(e) => updateField("street_address", e.target.value)}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Region */}
          <div className="grid gap-1.5">
            <Label htmlFor="customer-region">Region</Label>
            <select
              id="customer-region"
              className={selectClassName}
              value={selectedRegionCode}
              onChange={handleRegionChange}
            >
              <option value="">Select Region</option>
              {regionList.map((item) => (
                <option key={item.region_code} value={item.region_code}>
                  {item.region_name}
                </option>
              ))}
            </select>
          </div>

          {/* Province */}
          <div className="grid gap-1.5">
            <Label htmlFor="customer-province">Province</Label>
            <select
              id="customer-province"
              className={selectClassName}
              value={selectedProvinceCode}
              onChange={handleProvinceChange}
              disabled={provinceList.length === 0}
            >
              <option value="">
                {provinceList.length === 0
                  ? "N/A (e.g. Metro Manila)"
                  : "Select Province"}
              </option>
              {provinceList.map((item) => (
                <option key={item.province_code} value={item.province_code}>
                  {item.province_name}
                </option>
              ))}
            </select>
          </div>

          {/* City / Municipality */}
          <div className="grid gap-1.5">
            <Label htmlFor="customer-city_municipality">
              City / Municipality
            </Label>
            <select
              id="customer-city_municipality"
              className={selectClassName}
              value={selectedCityCode}
              onChange={handleCityChange}
              disabled={cityList.length === 0}
            >
              <option value="">Select City / Municipality</option>
              {cityList.map((item) => (
                <option key={item.city_code} value={item.city_code}>
                  {item.city_name}
                </option>
              ))}
            </select>
          </div>

          {/* Barangay */}
          <div className="grid gap-1.5">
            <Label htmlFor="customer-barangay">Barangay</Label>
            <select
              id="customer-barangay"
              className={selectClassName}
              value={selectedBarangayCode}
              onChange={handleBarangayChange}
              disabled={barangayList.length === 0}
            >
              <option value="">Select Barangay</option>
              {barangayList.map((item) => (
                <option key={item.brgy_code} value={item.brgy_code}>
                  {item.brgy_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Postal Code & Read-Only Auto PSGC Code */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="customer-postal_code">Postal code</Label>
            <Input
              id="customer-postal_code"
              placeholder="e.g. 1550"
              value={form.postal_code}
              onChange={(e) => updateField("postal_code", e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label
              htmlFor="customer-psgc_code"
              className="text-muted-foreground"
            >
              PSGC code (Auto)
            </Label>
            <Input
              id="customer-psgc_code"
              readOnly
              className="bg-muted text-muted-foreground cursor-not-allowed"
              placeholder="e.g. 137401002"
              value={form.psgc_code}
            />
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating..." : "Create customer"}
        </Button>
      </div>
    </form>
  );
}

export default CreateCustomerForm;
