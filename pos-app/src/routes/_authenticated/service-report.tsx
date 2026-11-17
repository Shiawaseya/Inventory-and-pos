import { createFileRoute } from "@tanstack/react-router";
import { ServiceReportPage } from "@/features/serviceReports";

export const Route = createFileRoute("/_authenticated/service-report")({
  component: ServiceReportPage,
});
