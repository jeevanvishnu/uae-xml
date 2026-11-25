export type UserRole =
  | "reception"
  | "doctor"
  | "pharmacist"
  | "billing"
  | "admin"
  | "superadmin";

/**
 * Returns the default workspace dashboard path for a given user role.
 */
export function getDashboardForRole(role?: string | null): string {
  switch (role) {
    case "reception":
      return "/dashboard/reception";
    case "doctor":
      return "/dashboard/doctor";
    case "pharmacist":
      return "/pharmacy";
    case "billing":
      return "/billing";
    case "admin":
      return "/admin/facility";
    case "superadmin":
      return "/super-admin/companies";
    default:
      return "/login";
  }
}

/**
 * Public routes that do not require an active session.
 */
export const PUBLIC_ROUTES = ["/", "/login", "/reset-password"];

export function isPublicRoute(pathname: string): boolean {
  const normalized = pathname === "/" ? "/" : pathname.replace(/\/+$/, "");
  return PUBLIC_ROUTES.some(
    (route) => normalized === route || (route !== "/" && normalized.startsWith(`${route}/`))
  );
}

/**
 * Checks whether a signed-in user's role is authorized to access the given path.
 */
export function canRoleAccessPath(role: string | undefined | null, pathname: string): boolean {
  if (!role) return false;
  const normalized = pathname === "/" ? "/" : pathname.replace(/\/+$/, "");

  // Shared authenticated routes accessible to all signed-in users
  if (normalized === "/dashboard" || normalized.startsWith("/profile")) {
    return true;
  }

  switch (role) {
    case "reception":
      return (
        normalized === "/dashboard/reception" ||
        normalized.startsWith("/dashboard/reception/") ||
        normalized === "/reception" ||
        normalized.startsWith("/reception/")
      );

    case "doctor":
      return (
        normalized === "/dashboard/doctor" ||
        normalized.startsWith("/dashboard/doctor/") ||
        normalized === "/doctor" ||
        normalized.startsWith("/doctor/")
      );

    case "pharmacist":
      return normalized === "/pharmacy" || normalized.startsWith("/pharmacy/");

    case "billing":
      return normalized === "/billing" || normalized.startsWith("/billing/");

    case "admin":
      return (
        normalized === "/admin" ||
        normalized.startsWith("/admin/") ||
        (normalized.startsWith("/dashboard/") &&
          !normalized.startsWith("/dashboard/reception") &&
          !normalized.startsWith("/dashboard/doctor"))
      );

    case "superadmin":
      return (
        normalized === "/super-admin" ||
        normalized.startsWith("/super-admin/") ||
        normalized === "/admin" ||
        normalized.startsWith("/admin/") ||
        (normalized.startsWith("/dashboard/") &&
          !normalized.startsWith("/dashboard/reception") &&
          !normalized.startsWith("/dashboard/doctor"))
      );

    default:
      return false;
  }
}
