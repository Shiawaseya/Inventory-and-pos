import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeftRight,
  ListChecks,
  QrCode,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TeamOnboardingSideBySideView } from "@/features/authentications";
import { loginApi } from "@/features/authentications/api/loginApi";
import { useTeamOnboarding } from "@/features/authentications/queries/useTeamOnboarding";
import { useStaff } from "@/features/user/queries/useStaff";
import { staffApi, type StaffQuery } from "@/features/user/api/staffApi";
import type { StaffMember } from "@/features/user/types/staff";

const PER_PAGE = 10;

const SORT_OPTIONS: {
  value: string;
  label: string;
  sort: NonNullable<StaffQuery["sort"]>;
  direction: NonNullable<StaffQuery["direction"]>;
}[] = [
  {
    value: "name-asc",
    label: "Name (A–Z)",
    sort: "last_name",
    direction: "asc",
  },
  {
    value: "name-desc",
    label: "Name (Z–A)",
    sort: "last_name",
    direction: "desc",
  },
  {
    value: "newest",
    label: "Newest first",
    sort: "created_at",
    direction: "desc",
  },
  {
    value: "oldest",
    label: "Oldest first",
    sort: "created_at",
    direction: "asc",
  },
  {
    value: "position",
    label: "Position (A–Z)",
    sort: "position",
    direction: "asc",
  },
];
const DEFAULT_SORT = SORT_OPTIONS[0].value;

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatDateTime(value: string | null) {
  if (!value || value === "—") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

const ROLE_SALES_REP = "sales-representative";
const ROLE_INVENTORY_CLERK = "inventory-clerk";

// Sales representatives and inventory clerks can rotate into each other.
// The Sales-OIC (and any other role) is not part of the rotation.
function getRotationTarget(member: StaffMember) {
  if (member.role_key === ROLE_SALES_REP) {
    return { roleKey: ROLE_INVENTORY_CLERK, label: "Inventory Clerk" };
  }
  if (
    member.role_key === ROLE_INVENTORY_CLERK ||
    member.role_key === "inventory_clerk"
  ) {
    return { roleKey: ROLE_SALES_REP, label: "Sales Representative" };
  }
  return null;
}

function isActive(member: StaffMember) {
  return member.status.toLowerCase() === "active";
}

export default function StaffManagementPage() {
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState(DEFAULT_SORT);
  const [page, setPage] = useState(1);
  const [selectedEmployee, setSelectedEmployee] = useState<StaffMember | null>(
    null,
  );
  const [pendingStatusChange, setPendingStatusChange] = useState<{
    employee: StaffMember;
    action: "activate" | "deactivate";
  } | null>(null);
  const [pendingRoleChange, setPendingRoleChange] = useState<{
    employee: StaffMember;
    roleKey: string;
    label: string;
  } | null>(null);
  const [updatingEmployeeId, setUpdatingEmployeeId] = useState<
    number | string | null
  >(null);

  const { pendingOnboarding, isLoading: isOnboardingLoading } =
    useTeamOnboarding();

  const sortOption =
    SORT_OPTIONS.find((option) => option.value === sortKey) ?? SORT_OPTIONS[0];

  const {
    data,
    staffMembers,
    isLoading: isStaffLoading,
    isFetching,
    isError: isStaffError,
    error: staffError,
    refetch,
  } = useStaff({
    page,
    perPage: PER_PAGE,
    search,
    sort: sortOption.sort,
    direction: sortOption.direction,
  });

  // The logged-in user can't deactivate themselves.
  const currentUser = loginApi.getUser() as unknown as Record<
    string,
    unknown
  > | null;
  const currentEmployeeId = String(
    currentUser?.employeeId ??
      currentUser?.employee_id ??
      currentUser?.id ??
      "",
  );

  // Debounce the search box so we don't fire a request on every keystroke.
  useEffect(() => {
    const trimmed = searchInput.trim();
    if (trimmed === search) return;
    const timeout = window.setTimeout(() => {
      setSearch(trimmed);
      setPage(1);
    }, 400);
    return () => window.clearTimeout(timeout);
  }, [searchInput, search]);

  const pagination = data?.pagination;
  const totalPages = pagination?.total_pages ?? 1;

  // If the current page disappears (e.g. fewer results), step back.
  useEffect(() => {
    if (!isStaffLoading && totalPages > 0 && page > totalPages) {
      setPage(totalPages);
    }
  }, [isStaffLoading, totalPages, page]);

  const hasFilters = search !== "" || sortKey !== DEFAULT_SORT;

  function clearFilters() {
    setSearchInput("");
    setSearch("");
    setSortKey(DEFAULT_SORT);
    setPage(1);
  }

  const handleStatusToggle = async (
    employeeId: number | string,
    action: "activate" | "deactivate",
  ) => {
    setUpdatingEmployeeId(employeeId);
    try {
      await staffApi.setStatus(employeeId, action);
      toast.success(`Employee ${action}d successfully.`);
      await queryClient.invalidateQueries({ queryKey: ["staff"] });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to update employee status.",
      );
    } finally {
      setUpdatingEmployeeId(null);
    }
  };

  const handleRoleRotation = async (
    employeeId: number | string,
    roleKey: string,
    label: string,
  ) => {
    setUpdatingEmployeeId(employeeId);
    try {
      await staffApi.changeRole(employeeId, roleKey);
      toast.success(`Role changed to ${label}.`);
      await queryClient.invalidateQueries({ queryKey: ["staff"] });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to change role.",
      );
    } finally {
      setUpdatingEmployeeId(null);
    }
  };

  const pendingCount = Array.isArray(pendingOnboarding)
    ? pendingOnboarding.length
    : 0;
  const firstItem =
    pagination && pagination.total_items > 0 ? (page - 1) * PER_PAGE + 1 : 0;
  const lastItem = pagination
    ? Math.min(page * PER_PAGE, pagination.total_items)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Staff Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage team members and onboarding QR invitations
          </p>
        </div>
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
            {pendingCount > 0 && (
              <Badge variant="secondary">{pendingCount}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="directory">
          <Card>
            <CardHeader className="space-y-4">
              <div>
                <CardTitle>Staff Members</CardTitle>
                <CardDescription>
                  {pagination && pagination.total_items > 0
                    ? `${pagination.total_items} staff member${
                        pagination.total_items === 1 ? "" : "s"
                      }${search ? ` matching “${search}”` : " in your branch"}`
                    : "View and manage all staff members in your branch"}
                </CardDescription>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1 sm:max-w-sm">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="search"
                    className="pl-9"
                    placeholder="Search by name, username, or email"
                    aria-label="Search staff"
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                  />
                </div>
                <Select
                  value={sortKey}
                  onValueChange={(value) => {
                    setSortKey(value);
                    setPage(1);
                  }}
                >
                  <SelectTrigger
                    className="w-full sm:w-44"
                    aria-label="Sort staff"
                  >
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {hasFilters && (
                  <Button variant="ghost" onClick={clearFilters}>
                    <X className="mr-2 h-4 w-4" />
                    Clear
                  </Button>
                )}
              </div>
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
                  {isStaffLoading ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="h-24 text-center text-muted-foreground"
                      >
                        Loading staff members...
                      </TableCell>
                    </TableRow>
                  ) : isStaffError ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                        <div
                          role="alert"
                          className="flex flex-col items-center gap-3 text-destructive"
                        >
                          <span>
                            {staffError instanceof Error
                              ? staffError.message
                              : "Unable to load staff members."}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => void refetch()}
                            disabled={isFetching}
                          >
                            <RefreshCw
                              className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
                            />
                            Try again
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : staffMembers.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="h-24 text-center text-muted-foreground"
                      >
                        {search
                          ? `No staff members match “${search}”.`
                          : "No staff members yet. Approve an onboarding request to add one."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    staffMembers.map((member) => {
                      const active = isActive(member);
                      const isSelf = String(member.id) === currentEmployeeId;
                      const isUpdating = updatingEmployeeId === member.id;
                      const rotation = getRotationTarget(member);

                      return (
                        <TableRow
                          key={member.id}
                          className="cursor-pointer"
                          tabIndex={0}
                          onClick={() => setSelectedEmployee(member)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              setSelectedEmployee(member);
                            }
                          }}
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9">
                                <AvatarFallback>
                                  {getInitials(member.name)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">
                                {member.name}
                                {isSelf && (
                                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                                    (you)
                                  </span>
                                )}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>{member.position}</TableCell>
                          <TableCell>{member.email || "—"}</TableCell>
                          <TableCell>
                            <Badge variant={active ? "default" : "secondary"}>
                              {member.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-2">
                              {rotation && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={isUpdating || !active}
                                  title={
                                    active
                                      ? `Rotate to ${rotation.label}`
                                      : "Activate the employee before changing their role"
                                  }
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setPendingRoleChange({
                                      employee: member,
                                      roleKey: rotation.roleKey,
                                      label: rotation.label,
                                    });
                                  }}
                                  onKeyDown={(event) => event.stopPropagation()}
                                >
                                  <ArrowLeftRight className="mr-2 h-4 w-4" />
                                  Rotate to {rotation.label}
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                className={
                                  active
                                    ? "text-red-600 hover:text-red-700"
                                    : "text-green-600 hover:text-green-700"
                                }
                                disabled={isUpdating || (isSelf && active)}
                                title={
                                  isSelf && active
                                    ? "You can't deactivate your own account"
                                    : undefined
                                }
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setPendingStatusChange({
                                    employee: member,
                                    action: active ? "deactivate" : "activate",
                                  });
                                }}
                                onKeyDown={(event) => event.stopPropagation()}
                              >
                                {isUpdating
                                  ? "Updating..."
                                  : active
                                    ? "Deactivate"
                                    : "Activate"}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
            {pagination && pagination.total_items > 0 && (
              <div className="flex flex-col gap-3 border-t px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing {firstItem}–{lastItem} of {pagination.total_items} ·
                  Page {pagination.current_page} of {pagination.total_pages}
                </p>
                {pagination.total_pages > 1 && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1 || isFetching}
                      onClick={() => setPage((current) => current - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= pagination.total_pages || isFetching}
                      onClick={() => setPage((current) => current + 1)}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="onboarding">
          <TeamOnboardingSideBySideView
            items={pendingOnboarding}
            isLoading={isOnboardingLoading}
          />
        </TabsContent>
      </Tabs>

      <Dialog
        open={selectedEmployee !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedEmployee(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Employee details</DialogTitle>
            <DialogDescription>
              Complete information for {selectedEmployee?.name}.
            </DialogDescription>
          </DialogHeader>
          {selectedEmployee && (
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <Detail label="Name" value={selectedEmployee.name} />
              <Detail label="Username" value={selectedEmployee.username} />
              <Detail label="Position" value={selectedEmployee.position} />
              <Detail label="Role" value={selectedEmployee.role_key} />
              <Detail label="Email" value={selectedEmployee.email} />
              <Detail
                label="Contact number"
                value={selectedEmployee.contact_number}
              />
              <Detail label="Status" value={selectedEmployee.status} />
              <Detail
                label="Created"
                value={formatDateTime(selectedEmployee.created_at)}
              />
              {!isActive(selectedEmployee) && (
                <Detail
                  label="Deactivated"
                  value={formatDateTime(selectedEmployee.deactivated_at)}
                />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={pendingRoleChange !== null}
        onOpenChange={(open) => {
          if (!open) setPendingRoleChange(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rotate role?</DialogTitle>
            <DialogDescription>
              {pendingRoleChange?.employee.name} will change from{" "}
              {pendingRoleChange?.employee.position} to{" "}
              {pendingRoleChange?.label}. Their access and screens will switch
              to the new role.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPendingRoleChange(null)}
            >
              Cancel
            </Button>
            <Button
              disabled={updatingEmployeeId !== null}
              onClick={async () => {
                if (!pendingRoleChange) return;
                const { employee, roleKey, label } = pendingRoleChange;
                setPendingRoleChange(null);
                await handleRoleRotation(employee.id, roleKey, label);
              }}
            >
              Confirm rotation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={pendingStatusChange !== null}
        onOpenChange={(open) => {
          if (!open) setPendingStatusChange(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pendingStatusChange?.action === "activate"
                ? "Activate employee?"
                : "Deactivate employee?"}
            </DialogTitle>
            <DialogDescription>
              {pendingStatusChange?.employee.name} will be{" "}
              {pendingStatusChange?.action === "activate"
                ? "allowed to access the system."
                : "unable to access the system."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPendingStatusChange(null)}
            >
              Cancel
            </Button>
            <Button
              variant={
                pendingStatusChange?.action === "deactivate"
                  ? "destructive"
                  : "default"
              }
              disabled={updatingEmployeeId !== null}
              onClick={async () => {
                if (!pendingStatusChange) return;
                const { employee, action } = pendingStatusChange;
                setPendingStatusChange(null);
                await handleStatusToggle(employee.id, action);
              }}
            >
              {pendingStatusChange?.action === "activate"
                ? "Activate"
                : "Deactivate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <p className="font-medium break-words">{value || "—"}</p>
    </div>
  );
}
