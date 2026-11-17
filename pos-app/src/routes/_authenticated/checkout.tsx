import { createFileRoute } from "@tanstack/react-router";
import { CheckoutPage } from "@/features/pos";

export const Route = createFileRoute("/_authenticated/checkout")({
  component: CheckoutPage,
});
