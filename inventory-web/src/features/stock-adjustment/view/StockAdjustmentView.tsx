import { useState } from "react";
import { CheckCircle2, ClipboardList, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdjustmentForm } from "../components/AdjustmentForm";
import { AdjustmentLog } from "../components/AdjustmentLog";

const tabTriggerClass =
  "-mb-px h-auto flex-none gap-2 rounded-none border-0 border-b-2 border-transparent px-3 pb-3 pt-2 text-sm text-muted-foreground shadow-none " +
  "data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none " +
  "dark:data-[state=active]:border-transparent dark:data-[state=active]:border-b-primary dark:data-[state=active]:bg-transparent";

type TabValue = "new" | "log";

export default function StockAdjustmentView() {
  const [tab, setTab] = useState<TabValue>("new");
  const [saved, setSaved] = useState(false);

  const changeTab = (value: string) => {
    setTab(value as TabValue);
    setSaved(false);
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 pb-12">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Stock adjustments
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Correct stock after a count, write off damaged or missing units, and
          keep a record of every change to unit status.
        </p>
      </header>

      <Tabs value={tab} onValueChange={changeTab} className="space-y-8">
        <TabsList className="h-auto w-full justify-start gap-2 rounded-none border-b bg-transparent p-0">
          <TabsTrigger value="new" className={tabTriggerClass}>
            <ClipboardList className="size-4" />
            New adjustment
          </TabsTrigger>
          <TabsTrigger value="log" className={tabTriggerClass}>
            <History className="size-4" />
            Adjustment log
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="new"
          className="space-y-4 focus-visible:outline-none"
        >
          {saved && (
            <div
              role="status"
              className="flex flex-col gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/[0.06] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <p className="flex items-center gap-2 text-sm text-foreground">
                <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                Adjustment saved.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => changeTab("log")}
                className="self-start sm:self-auto"
              >
                View in log
              </Button>
            </div>
          )}

          <section className=" overflow-hidden rounded-xl border bg-card">
            <div className="border-b px-5 py-4 sm:px-6">
              <h2 className="text-base font-semibold text-foreground">
                New adjustment
              </h2>
              <p className="text-sm text-muted-foreground">
                Add serial numbers, choose a reason, and update their status in
                one batch.
              </p>
            </div>
            <div className="p-5 sm:p-6">
              <AdjustmentForm onSuccess={() => setSaved(true)} />
            </div>
          </section>
        </TabsContent>

        <TabsContent value="log" className="focus-visible:outline-none">
          <AdjustmentLog />
        </TabsContent>
      </Tabs>
    </div>
  );
}
