import PendingAuthorizationRoute from "@/features/items/view/PendingAuthorizationRoute";

export default function PendingAuthorizationPage() {
  return (
    <div className="h-full w-full overflow-y-auto p-6 custom-scrollbar">
      <div className="max-w-[1600px] mx-auto space-y-6">
        <PendingAuthorizationRoute />
      </div>
    </div>
  );
}
