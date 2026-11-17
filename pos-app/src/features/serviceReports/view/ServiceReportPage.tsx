import { ClipboardList, History } from "lucide-react";
import { loginApi } from "@/features/authentications/api/loginApi";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ServiceReportForm from "../components/ServiceReportForm";
import ServiceReportHistory from "../components/ServiceReportHistory";

const tabTriggerClass =
  "-mb-px h-auto flex-none gap-2 rounded-none border-0 border-b-2 border-transparent px-3 pb-3 pt-2 text-sm text-muted-foreground shadow-none " +
  "data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none " +
  "dark:data-[state=active]:border-transparent dark:data-[state=active]:border-b-primary dark:data-[state=active]:bg-transparent";

export default function ServiceReportPage() {
  const user = loginApi.getUser();
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ");

  return (
    <div className="w-full space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Service reports
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          File a warranty complaint for a unit your branch sold, then follow it
          through service and certification.
        </p>
      </header>

      <Tabs defaultValue="create" className="space-y-8">
        <TabsList className="h-auto w-full justify-start gap-2 rounded-none border-b bg-transparent p-0">
          <TabsTrigger value="create" className={tabTriggerClass}>
            <ClipboardList className="size-4" />
            New report
          </TabsTrigger>
          <TabsTrigger value="history" className={tabTriggerClass}>
            <History className="size-4" />
            Branch reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="focus-visible:outline-none">
          <ServiceReportForm
            user={{
              name: fullName || user?.username || "Authenticated user",
              branchId: user?.branchId || "",
            }}
          />
        </TabsContent>

        <TabsContent value="history" className="focus-visible:outline-none">
          <ServiceReportHistory branchId={user?.branchId || ""} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
