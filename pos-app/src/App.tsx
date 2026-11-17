import { TooltipProvider } from "@/components/ui/tooltip";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { SocketProvider } from "@/context/socketProvider";
import { ToastContainer } from "@/features/notifications";

const router = createRouter({ routeTree });

export default function App() {
  return (
    <TooltipProvider>
      <SocketProvider>
        <RouterProvider router={router} />
      </SocketProvider>
      <ToastContainer />
    </TooltipProvider>
  );
}
