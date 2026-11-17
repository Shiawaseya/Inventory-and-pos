import { useState, useEffect, type ChangeEvent } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  regions,
  provinces,
  cities,
  barangays,
} from "select-philippines-address";
import type { EmployeeAddress } from "../types/profile";

type PhilippineAddressSelectorProps = {
  value: EmployeeAddress;
  onChange: (address: EmployeeAddress) => void;
  disabled?: boolean;
};

const selectClassName =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

export function PhilippineAddressSelector({
  value,
  onChange,
  disabled = false,
}: PhilippineAddressSelectorProps) {
  // Cascading lists
  const [regionList, setRegionList] = useState<any[]>([]);
  const [provinceList, setProvinceList] = useState<any[]>([]);
  const [cityList, setCityList] = useState<any[]>([]);
  const [barangayList, setBarangayList] = useState<any[]>([]);

  // Selected dropdown code tracking
  const [selectedRegionCode, setSelectedRegionCode] = useState("");
  const [selectedProvinceCode, setSelectedProvinceCode] = useState("");
  const [selectedCityCode, setSelectedCityCode] = useState("");
  const [selectedBarangayCode, setSelectedBarangayCode] = useState("");

  // Load regions on mount
  useEffect(() => {
    regions().then((data: any) => {
      setRegionList(data || []);
    });
  }, []);

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

    onChange({
      ...value,
      region: regObj ? regObj.region_name : "",
      province: "",
      city_municipality: "",
      barangay: "",
      psgc_code: regCode,
    });

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

    onChange({
      ...value,
      province: provObj ? provObj.province_name : "",
      city_municipality: "",
      barangay: "",
      psgc_code: provCode,
    });

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

    onChange({
      ...value,
      city_municipality: cityObj ? cityObj.city_name : "",
      barangay: "",
      psgc_code: cityCode,
    });

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
    onChange({
      ...value,
      barangay: brgyObj ? brgyObj.brgy_name : "",
      psgc_code: brgyCode,
    });
  };

  return (
    <div className="grid gap-3 text-left">
      {/* Street Address */}
      <div className="grid gap-1.5">
        <Label htmlFor="emp-street_address">Street / Building / Unit</Label>
        <Input
          id="emp-street_address"
          placeholder="e.g. Unit 402 Sunshine Tower, Boni Ave"
          value={value.street_address || ""}
          disabled={disabled}
          onChange={(e) =>
            onChange({ ...value, street_address: e.target.value })
          }
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {/* Region */}
        <div className="grid gap-1.5">
          <Label htmlFor="emp-region">Region</Label>
          <select
            id="emp-region"
            className={selectClassName}
            value={selectedRegionCode}
            onChange={handleRegionChange}
            disabled={disabled}
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
          <Label htmlFor="emp-province">Province</Label>
          <select
            id="emp-province"
            className={selectClassName}
            value={selectedProvinceCode}
            onChange={handleProvinceChange}
            disabled={disabled || provinceList.length === 0}
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
          <Label htmlFor="emp-city_municipality">City / Municipality</Label>
          <select
            id="emp-city_municipality"
            className={selectClassName}
            value={selectedCityCode}
            onChange={handleCityChange}
            disabled={disabled || cityList.length === 0}
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
          <Label htmlFor="emp-barangay">Barangay</Label>
          <select
            id="emp-barangay"
            className={selectClassName}
            value={selectedBarangayCode}
            onChange={handleBarangayChange}
            disabled={disabled || barangayList.length === 0}
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

      {/* Postal Code & PSGC Code */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="emp-postal_code">Postal Code</Label>
          <Input
            id="emp-postal_code"
            placeholder="e.g. 1550"
            value={value.postal_code || ""}
            disabled={disabled}
            onChange={(e) =>
              onChange({ ...value, postal_code: e.target.value })
            }
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="emp-psgc_code" className="text-muted-foreground">
            PSGC Code (Auto)
          </Label>
          <Input
            id="emp-psgc_code"
            readOnly
            className="bg-muted text-muted-foreground cursor-not-allowed"
            placeholder="e.g. 137401002"
            value={value.psgc_code || ""}
          />
        </div>
      </div>
    </div>
  );
}
