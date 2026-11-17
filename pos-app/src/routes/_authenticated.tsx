import { createFileRoute, redirect } from "@tanstack/react-router";
import { loginApi } from "@/features/authentications/api";
import { POSShell } from "@/components/pos/POSShell";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: ({ location }) => {
    if (!loginApi.isAuthenticated()) {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
  },
  component: POSShell,
});
