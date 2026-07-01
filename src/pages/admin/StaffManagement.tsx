import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  UserPlus,
  Edit,
  Trash2,
  Search,
  Shield,
  User,
  Mail,
  Phone,
  Clock,
  Calendar,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import mdcLogo from "@/assets/mdc-logo.jpg";

type AppRole =
  | "super_admin"
  | "manager"
  | "receptionist"
  | "dentist"
  | "dental_assistant"
  | "accountant"
  | "it_admin"
  | "cashier"
  | "lab_technician"
  | "pharmacist"
  | "nurse"
  | "cleaner"
  | "security_guard";

interface Staff {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  specialization: string | null;
  bio: string | null;
  avatar_url: string | null;
  is_active: boolean;
  working_days: string[] | null;
  working_hours_start: string | null;
  working_hours_end: string | null;
  user_id: string | null;
  created_at: string;
}

interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  user_email?: string;
}

const ROLES: { value: AppRole; label: string }[] = [
  { value: "super_admin", label: "Super Admin" },
  { value: "dentist", label: "Dentist" },
  { value: "receptionist", label: "Receptionist" },
  { value: "accountant", label: "Accountant" },
];

const WORKING_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export default function StaffManagement() {
  const { toast } = useToast();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    specialization: "",
    bio: "",
    is_active: true,
    working_days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    working_hours_start: "08:00",
    working_hours_end: "20:00",
  });

  // Role assignment state
  const [roleUserId, setRoleUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState<AppRole>("dentist");

  useEffect(() => {
    fetchStaff();
    fetchUserRoles();
  }, []);

  const fetchStaff = async () => {
    const { data, error } = await supabase
      .from("staff")
      .select("*")
      .order("full_name");

    if (error) {
      toast({
        title: "Error fetching staff",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setStaff(data || []);
    }
    setIsLoading(false);
  };

  const fetchUserRoles = async () => {
    const { data, error } = await supabase
      .from("user_roles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching roles:", error);
    } else {
      setUserRoles(data || []);
    }
  };

  const handleAddStaff = async () => {
    const { error } = await supabase.from("staff").insert({
      full_name: formData.full_name,
      email: formData.email || null,
      phone: formData.phone || null,
      specialization: formData.specialization || null,
      bio: formData.bio || null,
      is_active: formData.is_active,
      working_days: formData.working_days,
      working_hours_start: formData.working_hours_start,
      working_hours_end: formData.working_hours_end,
    });

    if (error) {
      toast({
        title: "Error adding staff",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Staff added",
        description: `${formData.full_name} has been added to the team.`,
      });
      setIsAddDialogOpen(false);
      resetForm();
      fetchStaff();
    }
  };

  const handleEditStaff = async () => {
    if (!selectedStaff) return;

    const { error } = await supabase
      .from("staff")
      .update({
        full_name: formData.full_name,
        email: formData.email || null,
        phone: formData.phone || null,
        specialization: formData.specialization || null,
        bio: formData.bio || null,
        is_active: formData.is_active,
        working_days: formData.working_days,
        working_hours_start: formData.working_hours_start,
        working_hours_end: formData.working_hours_end,
      })
      .eq("id", selectedStaff.id);

    if (error) {
      toast({
        title: "Error updating staff",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Staff updated",
        description: `${formData.full_name} has been updated.`,
      });
      setIsEditDialogOpen(false);
      resetForm();
      fetchStaff();
    }
  };

  const handleDeleteStaff = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;

    const { error } = await supabase.from("staff").delete().eq("id", id);

    if (error) {
      toast({
        title: "Error deleting staff",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Staff deleted",
        description: `${name} has been removed from the team.`,
      });
      fetchStaff();
    }
  };

  const handleAssignRole = async () => {
    if (!roleUserId) {
      toast({
        title: "User ID required",
        description: "Please enter a user ID.",
        variant: "destructive",
      });
      return;
    }

    // Check if role already exists
    const existingRole = userRoles.find(
      (r) => r.user_id === roleUserId && r.role === selectedRole
    );

    if (existingRole) {
      toast({
        title: "Role already assigned",
        description: "This user already has this role.",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase.from("user_roles").insert({
      user_id: roleUserId,
      role: selectedRole,
    });

    if (error) {
      toast({
        title: "Error assigning role",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Role assigned",
        description: `Role ${selectedRole} has been assigned.`,
      });
      setIsRoleDialogOpen(false);
      setRoleUserId("");
      fetchUserRoles();
    }
  };

  const handleRemoveRole = async (roleId: string) => {
    if (!confirm("Are you sure you want to remove this role?")) return;

    const { error } = await supabase.from("user_roles").delete().eq("id", roleId);

    if (error) {
      toast({
        title: "Error removing role",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Role removed",
        description: "The role has been removed.",
      });
      fetchUserRoles();
    }
  };

  const openEditDialog = (staffMember: Staff) => {
    setSelectedStaff(staffMember);
    setFormData({
      full_name: staffMember.full_name,
      email: staffMember.email || "",
      phone: staffMember.phone || "",
      specialization: staffMember.specialization || "",
      bio: staffMember.bio || "",
      is_active: staffMember.is_active,
      working_days: staffMember.working_days || ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      working_hours_start: staffMember.working_hours_start || "08:00",
      working_hours_end: staffMember.working_hours_end || "20:00",
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      full_name: "",
      email: "",
      phone: "",
      specialization: "",
      bio: "",
      is_active: true,
      working_days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      working_hours_start: "08:00",
      working_hours_end: "20:00",
    });
    setSelectedStaff(null);
  };

  const toggleWorkingDay = (day: string) => {
    setFormData((prev) => ({
      ...prev,
      working_days: prev.working_days.includes(day)
        ? prev.working_days.filter((d) => d !== day)
        : [...prev.working_days, day],
    }));
  };

  const filteredStaff = staff.filter(
    (s) =>
      s.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.specialization?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadgeColor = (role: AppRole) => {
    switch (role) {
      case "super_admin":
        return "bg-red-500/10 text-red-600 border-red-500/20";
      case "dentist":
        return "bg-primary/10 text-primary border-primary/20";
      case "receptionist":
        return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "accountant":
        return "bg-green-500/10 text-green-600 border-green-500/20";
      default:
        return "";
    }
  };

  const StaffFormFields = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="full_name">Full Name *</Label>
          <Input
            id="full_name"
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            placeholder="Dr. John Doe"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="specialization">Role / Specialization</Label>
          <Input
            id="specialization"
            value={formData.specialization}
            onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
            placeholder="Dental Surgeon"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="doctor@clinic.com"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="+250 788 000 000"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="bio">Bio</Label>
        <Textarea
          id="bio"
          value={formData.bio}
          onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
          placeholder="Brief description..."
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label>Working Days</Label>
        <div className="flex flex-wrap gap-2">
          {WORKING_DAYS.map((day) => (
            <Button
              key={day}
              type="button"
              variant={formData.working_days.includes(day) ? "default" : "outline"}
              size="sm"
              onClick={() => toggleWorkingDay(day)}
            >
              {day.slice(0, 3)}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="working_hours_start">Start Time</Label>
          <Input
            id="working_hours_start"
            type="time"
            value={formData.working_hours_start}
            onChange={(e) => setFormData({ ...formData, working_hours_start: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="working_hours_end">End Time</Label>
          <Input
            id="working_hours_end"
            type="time"
            value={formData.working_hours_end}
            onChange={(e) => setFormData({ ...formData, working_hours_end: e.target.value })}
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Switch
          id="is_active"
          checked={formData.is_active}
          onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
        />
        <Label htmlFor="is_active">Active Staff Member</Label>
      </div>
    </div>
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header with Logo Watermark */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <img src={mdcLogo} alt="MDC Logo" className="w-12 h-12 object-contain opacity-30" />
            <div>
              <h1 className="text-2xl font-heading font-bold">Staff Management</h1>
              <p className="text-muted-foreground">Manage your clinic team and assign roles</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Shield className="w-4 h-4 mr-2" />
                  Assign Role
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Assign User Role</DialogTitle>
                  <DialogDescription>
                    Assign a system role to a user. Get the User ID from the Supabase Auth dashboard.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="userId">User ID (UUID)</Label>
                    <Input
                      id="userId"
                      value={roleUserId}
                      onChange={(e) => setRoleUserId(e.target.value)}
                      placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as AppRole)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map((role) => (
                          <SelectItem key={role.value} value={role.value}>
                            {role.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsRoleDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAssignRole}>Assign Role</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Staff
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add Staff Member</DialogTitle>
                  <DialogDescription>Add a new team member to the clinic.</DialogDescription>
                </DialogHeader>
                <StaffFormFields />
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddStaff} disabled={!formData.full_name}>
                    Add Staff
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search staff..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* User Roles Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              System Roles
            </CardTitle>
          </CardHeader>
          <CardContent>
            {userRoles.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No roles assigned yet.</p>
            ) : (
              <div className="space-y-2">
                {userRoles.map((role) => (
                  <div
                    key={role.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-mono">{role.user_id.slice(0, 8)}...</p>
                        <Badge className={getRoleBadgeColor(role.role)}>{role.role.replace("_", " ")}</Badge>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleRemoveRole(role.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Staff Table */}
        <Card>
          <CardHeader>
            <CardTitle>Team Members ({filteredStaff.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : filteredStaff.length === 0 ? (
              <div className="text-center py-8">
                <User className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No staff members found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staff Member</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Schedule</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStaff.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={member.avatar_url || undefined} />
                              <AvatarFallback className="bg-primary/10 text-primary">
                                {getInitials(member.full_name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{member.full_name}</p>
                              <p className="text-sm text-muted-foreground">
                                {member.specialization || "Staff"}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {member.email && (
                              <div className="flex items-center gap-1 text-sm">
                                <Mail className="w-3 h-3 text-muted-foreground" />
                                {member.email}
                              </div>
                            )}
                            {member.phone && (
                              <div className="flex items-center gap-1 text-sm">
                                <Phone className="w-3 h-3 text-muted-foreground" />
                                {member.phone}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-sm">
                              <Clock className="w-3 h-3 text-muted-foreground" />
                              {member.working_hours_start?.slice(0, 5)} -{" "}
                              {member.working_hours_end?.slice(0, 5)}
                            </div>
                            <div className="flex items-center gap-1 text-sm">
                              <Calendar className="w-3 h-3 text-muted-foreground" />
                              {member.working_days?.length || 0} days/week
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              member.is_active
                                ? "bg-green-500/10 text-green-600 border-green-500/20"
                                : "bg-red-500/10 text-red-600 border-red-500/20"
                            }
                          >
                            {member.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEditDialog(member)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDeleteStaff(member.id, member.full_name)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Staff Member</DialogTitle>
              <DialogDescription>Update staff member information.</DialogDescription>
            </DialogHeader>
            <StaffFormFields />
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEditStaff} disabled={!formData.full_name}>
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
