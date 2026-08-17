import { Center, Spinner } from "@chakra-ui/react";
import { Navigate } from "react-router-dom";
import { AppLayout } from "../components/layout/AppLayout";
import { useAuth } from "./AuthContext";

export function ProtectedLayout() {
  const { user, loading } = useAuth();
  if (loading) return <Center minH="100vh"><Spinner size="lg" color="green.600" /></Center>;
  if (!user) return <Navigate to="/login" replace />;
  return <AppLayout />;
}
