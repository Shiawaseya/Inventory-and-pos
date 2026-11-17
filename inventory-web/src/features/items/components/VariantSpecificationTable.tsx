import type { VariantSpecification } from "../api/variantSpecificationsApi";

type VariantSpecificationTableProps = {
  specifications: VariantSpecification[];
  isLoading?: boolean;
  emptyMessage?: string;
};

function displayValue(specification: VariantSpecification): string {
  if (specification.data_type === "option") {
    return specification.option_value || "-";
  }

  if (specification.data_type === "numeric") {
    const value = specification.numeric_value ?? "-";
    const unit = specification.unit?.symbol;
    return unit ? `${value} ${unit}` : String(value);
  }

  return specification.text_value || "-";
}

export function VariantSpecificationTable({
  specifications,
  isLoading = false,
  emptyMessage = "No specifications have been added yet.",
}: VariantSpecificationTableProps) {
  return (
    <div className="overflow-hidden rounded-md border">
      <table className="w-full table-fixed text-sm">
        <colgroup>
          <col className="w-1/2" />
          <col className="w-1/2" />
        </colgroup>
        <thead className="bg-muted/50 text-left">
          <tr>
            <th className="px-4 py-3 font-medium">Attribute</th>
            <th className="px-4 py-3 font-medium">Value</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td
                colSpan={2}
                className="px-4 py-10 text-center text-muted-foreground"
              >
                Loading specifications...
              </td>
            </tr>
          ) : specifications.length === 0 ? (
            <tr>
              <td
                colSpan={2}
                className="px-4 py-10 text-center text-muted-foreground"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            specifications.map((specification) => (
              <tr key={specification.attribute_id} className="border-t">
                <td className="wrap-break-word px-2 py-3 font-medium sm:px-4">
                  {specification.name ||
                    specification.attribute_name ||
                    "Attribute"}
                </td>
                <td className="wrap-break-word px-2 py-3 text-muted-foreground sm:px-4">
                  {displayValue(specification)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
