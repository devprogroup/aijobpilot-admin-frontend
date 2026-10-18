import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./AuthContext";

export function PlatformAdminRoute() {
  const { user } = useAuth();
  return user?.role === "technical" || user?.role === "super_admin"
    ? <Outlet />
    : <Navigate to="/account" replace />;
}
