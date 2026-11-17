import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TeamOnboardingApprovalDialog } from "../components/TeamOnboardingApprovalDialog";
import { QRCodeGenerator } from "../components/QRCodeGenerator";
import { TeamOnboardingCard } from "../components/TeamOnboardingCard";
import { TeamOnboardingRow } from "../components/TeamOnboardingRow";
import { useTeamOnboardingApproval } from "../hooks/useTeamOnboardingApproval";
import type { TeamOnboardingRecord } from "../types/teamOnboarding";

type TeamOnboardingSideBySideViewProps = {
  items: TeamOnboardingRecord[];
  isLoading?: boolean;
  onApprove?: (onboarding: TeamOnboardingRecord) => void;
  onDecline?: (onboarding: TeamOnboardingRecord) => void;
};

export function TeamOnboardingSideBySideView({ items, isLoading, onApprove, onDecline }: TeamOnboardingSideBySideViewProps) {
  const { selected, dialogOpen, setDialogOpen, openDialog, handleApprove, handleDecline, isMutating } =
    useTeamOnboardingApproval({ onApprove, onDecline });

  return (
    <>
      <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
      <div className="xl:sticky xl:top-4 xl:self-start">
        <QRCodeGenerator />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending Team Onboarding</CardTitle>
          <CardDescription>Review recently scanned or pending onboarding records.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full rounded-xl" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
              No pending team onboarding records found.
            </div>
          ) : (
            <Tabs defaultValue="cards" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2 md:w-64">
                <TabsTrigger value="cards">Card View</TabsTrigger>
                <TabsTrigger value="table">Table View</TabsTrigger>
              </TabsList>

              <TabsContent value="cards">
                <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
                  {items.map((item) => (
                    <button
                      key={item.team_onboarding_id}
                      className="text-left w-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => openDialog(item)}
                    >
                      <TeamOnboardingCard onboarding={item} />
                    </button>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="table">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Username</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Branch</TableHead>
                      <TableHead>Approval</TableHead>
                      <TableHead>Referred By</TableHead>
                      <TableHead>Created At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TeamOnboardingRow
                        key={item.team_onboarding_id}
                        onboarding={item}
                        onClick={() => openDialog(item)}
                      />
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>

    <TeamOnboardingApprovalDialog
      open={dialogOpen}
      onOpenChange={setDialogOpen}
      onboarding={selected}
      isLoading={isLoading || isMutating}
      onApprove={handleApprove}
      onDecline={handleDecline}
    />
    </>
  );
}
