import { createFileRoute } from "@tanstack/react-router";
import ProfilePage from "@/features/user/user/view/ProfilePage"; // adjust path to where ProfilePage.tsx lives

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
});
