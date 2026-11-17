import { createFileRoute } from "@tanstack/react-router";
import { AuthPage } from "@/features/authentications";

export const Route = createFileRoute("/login")({ component: AuthPage });
