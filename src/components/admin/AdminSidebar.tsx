import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  LayoutDashboard,
  Calendar,
  Users,
  UserCircle,
  Stethoscope,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  MessageSquare,
  FileText,
  Megaphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/admin/dashboard", roles: ["super_admin", "receptionist", "dentist", "accountant"] },
  { icon: Calendar, label: "Appointments", path: "/admin/appointments", roles: ["super_admin", "receptionist", "dentist"] },
  { icon: Users, label: "Patients", path: "/admin/patients", roles: ["super_admin", "receptionist", "dentist"] },
  { icon: MessageSquare, label: "Messages", path: "/admin/messages", roles: ["super_admin", "receptionist"] },
  { icon: UserCircle, label: "Staff", path: "/admin/staff", roles: ["super_admin"] },
  { icon: Stethoscope, label: "Services", path: "/admin/services", roles: ["super_admin"] },
  { icon: BarChart3, label: "Gallery", path: "/admin/gallery", roles: ["super_admin"] },
  { icon: FileText, label: "Blog", path: "/admin/blog", roles: ["super_admin"] },
  { icon: Megaphone, label: "Announcements", path: "/admin/announcements", roles: ["super_admin"] },
  { icon: Settings, label: "Settings", path: "/admin/settings", roles: ["super_admin"] },
];

export function AdminSidebar() {
  const location = useLocation();
  const { signOut, roles, user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const filteredMenuItems = menuItems.filter((item) =>
    item.roles.some((role) => roles.includes(role as any))
  );

  return (
    <aside
      className={cn(
        "bg-card border-r border-border h-screen sticky top-0 flex flex-col transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        {!collapsed && (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl hero-gradient flex items-center justify-center">
              <span className="text-primary-foreground font-heading font-bold text-lg">M</span>
            </div>
            <div>
              <h1 className="font-heading font-bold text-sm">Muhazi Dental</h1>
              <p className="text-xs text-muted-foreground">Staff Portal</p>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="shrink-0"
        >
          <Menu className="w-5 h-5" />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {filteredMenuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-border">
        {!collapsed && (
          <div className="mb-3">
            <p className="text-sm font-medium truncate">{user?.email}</p>
            <p className="text-xs text-muted-foreground capitalize">
              {roles[0]?.replace("_", " ") || "Staff"}
            </p>
          </div>
        )}
        <Button
          variant="ghost"
          size={collapsed ? "icon" : "default"}
          onClick={signOut}
          className={cn("text-muted-foreground hover:text-destructive", !collapsed && "w-full justify-start")}
        >
          <LogOut className="w-5 h-5" />
          {!collapsed && <span className="ml-2">Sign Out</span>}
        </Button>
      </div>
    </aside>
  );
}
