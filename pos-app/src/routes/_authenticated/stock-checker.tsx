import { createFileRoute } from "@tanstack/react-router";
import { StockCheckerPage } from "@/pages/pos/StockCheckerPage";

export const Route = createFileRoute("/_authenticated/stock-checker")({
  component: StockCheckerPage,
});
