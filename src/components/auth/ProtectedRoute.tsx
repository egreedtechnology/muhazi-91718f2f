import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

import type { AppRole } from "@/lib/rolePermissions";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: AppRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, isLoading, roles, isStaff } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin" state={{ from: location }} replace />;
  }

  if (!isStaff) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-4">
            You don't have permission to access the staff portal.
          </p>
          <p className="text-sm text-muted-foreground">
            Please contact the administrator to request access.
          </p>
        </div>
      </div>
    );
  }

  if (allowedRoles && !allowedRoles.some((role) => roles.includes(role))) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Insufficient Permissions</h1>
          <p className="text-muted-foreground">
            You don't have the required role to access this page.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
