import InventoryItemSerializedTable from "@/features/items/view/inventoryItemSerializedTable";

export default function InventoryPage() {
  return (
    <div className="h-full w-full flex flex-col  ">

      <div className="flex-1 min-h-0">
        <InventoryItemSerializedTable />
      </div>
    </div>
  );
}
