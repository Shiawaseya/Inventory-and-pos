import { createFileRoute } from "@tanstack/react-router";
import { ParkSalePage } from "@/pages/pos/ParkSalePage";

export const Route = createFileRoute("/_authenticated/parked-sales")({
  component: ParkSalePage,
});
