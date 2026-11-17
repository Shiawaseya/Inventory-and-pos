import { useQuery } from "@tanstack/react-query"
import { roleApi } from "@/features/authentications/api/roleApi"

export function useRoles() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["roles"],
    queryFn: roleApi.getAll,
  })

  const raw: any[] = data?.data ?? []

  const roles = raw.map((r) => ({
    id: r.role_id ?? r.id,
    key: r.role_key,
    displayName: r.display_name ?? r.name,
    created_at: r.created_at,
  }))

  return { roles, isLoading, isError, error, refetch }
}

export default useRoles
