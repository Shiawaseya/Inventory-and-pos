import { createFileRoute } from "@tanstack/react-router";
import ReportsPage from "@/pages/authenticated/Reports";

export const Route = createFileRoute("/_authenticated/reports")({
  component: ReportsPage,
});
