import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  LayoutDashboard,
  Calendar,
  CalendarDays,
  Users,
  UserCircle,
  Stethoscope,
  Image as ImageIcon,
  Settings,
  LogOut,
  MessageSquare,
  FileText,
  Megaphone,
  ChevronLeft,
  ChevronRight,
  Activity,
  LayoutGrid,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";

type Role = "super_admin" | "receptionist" | "dentist" | "accountant";

const sections: { label: string; items: { icon: any; label: string; path: string; roles: Role[] }[] }[] = [
  {
    label: "Workspace",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", path: "/admin/dashboard", roles: ["super_admin", "receptionist", "dentist", "accountant"] },
      { icon: LayoutGrid, label: "Triage board", path: "/admin/triage", roles: ["super_admin", "receptionist", "dentist"] },
      { icon: CalendarDays, label: "Calendar", path: "/admin/calendar", roles: ["super_admin", "receptionist", "dentist"] },
      { icon: Calendar, label: "Appointments", path: "/admin/appointments", roles: ["super_admin", "receptionist", "dentist"] },
    ],
  },
  {
    label: "People",
    items: [
      { icon: Users, label: "Patients", path: "/admin/patients", roles: ["super_admin", "receptionist", "dentist"] },
      { icon: MessageSquare, label: "Inbox", path: "/admin/messages", roles: ["super_admin", "receptionist"] },
      { icon: UserCircle, label: "Staff", path: "/admin/staff", roles: ["super_admin"] },
    ],
  },
  {
    label: "Content",
    items: [
      { icon: Stethoscope, label: "Services", path: "/admin/services", roles: ["super_admin"] },
      { icon: ImageIcon, label: "Gallery", path: "/admin/gallery", roles: ["super_admin"] },
      { icon: FileText, label: "Blog", path: "/admin/blog", roles: ["super_admin"] },
      { icon: Megaphone, label: "Announcements", path: "/admin/announcements", roles: ["super_admin"] },
    ],
  },
  {
    label: "System",
    items: [
      { icon: ShieldCheck, label: "Audit log", path: "/admin/audit-logs", roles: ["super_admin"] },
      { icon: Settings, label: "Settings", path: "/admin/settings", roles: ["super_admin"] },
    ],
  },
];

export function AdminSidebar() {
  const location = useLocation();
  const { signOut, roles, user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const can = (allowed: Role[]) => allowed.some((r) => roles.includes(r as any));
  const initials = (user?.email || "S").slice(0, 2).toUpperCase();

  return (
    <aside
      className={cn(
        "bg-sidebar text-sidebar-foreground h-screen sticky top-0 flex flex-col transition-[width] duration-300 border-r border-sidebar-border",
        collapsed ? "w-[68px]" : "w-[244px]"
      )}
    >
      {/* Brand */}
      <div className="h-14 px-3 flex items-center gap-3 border-b border-sidebar-border">
        <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-primary-glow to-primary flex items-center justify-center shadow-glow shrink-0">
          <Activity className="w-5 h-5 text-sidebar-primary-foreground" strokeWidth={2.5} />
          <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full bg-secondary border-2 border-sidebar" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="font-heading font-bold text-sm leading-none text-white">Muhazi DC</p>
            <p className="text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/60 mt-1">Clinic OS</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-4 overflow-y-auto">
        {sections.map((section) => {
          const visible = section.items.filter((i) => can(i.roles));
          if (visible.length === 0) return null;
          return (
            <div key={section.label}>
              {!collapsed && (
                <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/40">
                  {section.label}
                </p>
              )}
              <div className="space-y-0.5">
                {visible.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={cn(
                        "group relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                        isActive
                          ? "bg-sidebar-accent text-white"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-white"
                      )}
                      title={collapsed ? item.label : undefined}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-sidebar-primary" />
                      )}
                      <item.icon className={cn("w-[18px] h-[18px] shrink-0", isActive && "text-sidebar-primary")} />
                      {!collapsed && <span className="font-medium truncate">{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* User + collapse */}
      <div className="border-t border-sidebar-border p-3 space-y-2">
        <div className={cn("flex items-center gap-3 rounded-lg p-2", !collapsed && "bg-sidebar-accent/40")}>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-secondary to-primary-glow flex items-center justify-center text-white text-xs font-semibold shrink-0">
            {initials}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-white truncate">{user?.email}</p>
              <p className="text-[10px] uppercase tracking-wider text-sidebar-foreground/50">
                {roles[0]?.replace("_", " ") || "Staff"}
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            className={cn(
              "text-sidebar-foreground/70 hover:text-white hover:bg-sidebar-accent",
              collapsed ? "w-full justify-center px-0" : "flex-1 justify-start"
            )}
          >
            <LogOut className="w-4 h-4" />
            {!collapsed && <span className="ml-2 text-xs">Sign out</span>}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="text-sidebar-foreground/60 hover:text-white hover:bg-sidebar-accent shrink-0 h-8 w-8"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </aside>
  );
}
