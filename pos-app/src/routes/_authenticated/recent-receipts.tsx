import { createFileRoute } from "@tanstack/react-router";
import { RecentReceiptsPage } from "@/pages/pos/RecentReceiptsPage";

export const Route = createFileRoute("/_authenticated/recent-receipts")({
  component: RecentReceiptsPage,
});
