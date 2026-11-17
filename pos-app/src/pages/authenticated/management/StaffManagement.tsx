import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Users, UserCheck, UserX, QrCode, ListChecks } from "lucide-react"
import { TeamOnboardingSideBySideView } from "@/features/authentications"
import { useTeamOnboarding } from "@/features/authentications/queries/useTeamOnboarding"

export default function StaffManagementPage() {
  const { pendingOnboarding, isLoading } = useTeamOnboarding()
  // Placeholder data
  const staffMembers = [
    { id: 1, name: "John Doe", position: "Manager", email: "john@example.com", status: "Active" },
    { id: 2, name: "Jane Smith", position: "Staff", email: "jane@example.com", status: "Active" },
    { id: 3, name: "Bob Johnson", position: "Associate", email: "bob@example.com", status: "Inactive" },
  ]

  const totalStaff = staffMembers.length
  const activeStaff = staffMembers.filter((member) => member.status === "Active").length
  const inactiveStaff = totalStaff - activeStaff

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Staff Management</h1>
          <p className="text-muted-foreground mt-1">Manage team members and onboarding QR invitations</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Staff</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Users className="w-5 h-5 text-muted-foreground" />
              {totalStaff}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-muted-foreground" />
              {activeStaff}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Inactive</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <UserX className="w-5 h-5 text-muted-foreground" />
              {inactiveStaff}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Tabs defaultValue="directory" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 md:w-85">
          <TabsTrigger value="directory" className="gap-2">
            <ListChecks className="w-4 h-4" />
            Team Directory
          </TabsTrigger>
          <TabsTrigger value="onboarding" className="gap-2">
            <QrCode className="w-4 h-4" />
            Staff Onboarding
          </TabsTrigger>
        </TabsList>

        <TabsContent value="directory">
          <Card>
            <CardHeader>
              <CardTitle>Staff Members</CardTitle>
              <CardDescription>View and manage all staff members</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staffMembers.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{member.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{member.position}</TableCell>
                      <TableCell>{member.email}</TableCell>
                      <TableCell>
                        <Badge variant={member.status === "Active" ? "default" : "secondary"}>
                          {member.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            Edit
                          </Button>
                          <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700">
                            Remove
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="onboarding">
          <TeamOnboardingSideBySideView items={pendingOnboarding} isLoading={isLoading} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
