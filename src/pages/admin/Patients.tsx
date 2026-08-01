import { useState, useEffect } from "react";
import { Plus, Search, User, Trash2, Pencil, Phone, Mail, Calendar } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Patient {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  date_of_birth: string | null;
  gender: string | null;
  address: string | null;
  medical_notes: string | null;
  created_at: string;
}

export default function Patients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Patient | null>(null);
  const [deleteItem, setDeleteItem] = useState<Patient | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    email: "",
    date_of_birth: "",
    gender: "",
    address: "",
    medical_notes: "",
  });

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("patients")
      .select("*")
      .is("archived_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Error", description: "Failed to fetch patients", variant: "destructive" });
    } else {
      setPatients(data || []);
    }
    setIsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.full_name.trim() || !formData.phone.trim()) {
      toast({ title: "Error", description: "Name and phone are required", variant: "destructive" });
      return;
    }

    const payload = {
      full_name: formData.full_name,
      phone: formData.phone,
      email: formData.email || null,
      date_of_birth: formData.date_of_birth || null,
      gender: formData.gender || null,
      address: formData.address || null,
      medical_notes: formData.medical_notes || null,
    };

    if (editingItem) {
      const { error } = await supabase.from("patients").update(payload).eq("id", editingItem.id);
      if (error) {
        toast({ title: "Error", description: "Failed to update patient", variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Patient updated" });
        fetchPatients();
        resetForm();
      }
    } else {
      const { error } = await supabase.from("patients").insert(payload);
      if (error) {
        toast({ title: "Error", description: "Failed to add patient", variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Patient added" });
        fetchPatients();
        resetForm();
      }
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    const { error } = await supabase.from("patients").delete().eq("id", deleteItem.id);
    if (error) {
      toast({ title: "Error", description: "Cannot delete patient with existing appointments", variant: "destructive" });
    } else {
      toast({ title: "Deleted", description: "Patient removed" });
      fetchPatients();
    }
    setDeleteItem(null);
  };

  const handleEdit = (item: Patient) => {
    setEditingItem(item);
    setFormData({
      full_name: item.full_name,
      phone: item.phone,
      email: item.email || "",
      date_of_birth: item.date_of_birth || "",
      gender: item.gender || "",
      address: item.address || "",
      medical_notes: item.medical_notes || "",
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingItem(null);
    setFormData({
      full_name: "",
      phone: "",
      email: "",
      date_of_birth: "",
      gender: "",
      address: "",
      medical_notes: "",
    });
    setIsDialogOpen(false);
  };

  const filteredPatients = patients.filter((p) =>
    p.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.phone.includes(searchQuery) ||
    p.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Patients</h1>
            <p className="text-muted-foreground">{patients.length} registered patients</p>
          </div>
          <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Add Patient
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, phone, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : filteredPatients.length === 0 ? (
              <div className="text-center py-8">
                <User className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No patients found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Gender</TableHead>
                      <TableHead>Date of Birth</TableHead>
                      <TableHead>Registered</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPatients.map((patient) => (
                      <TableRow key={patient.id}>
                        <TableCell className="font-medium">{patient.full_name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Phone className="w-3 h-3" /> {patient.phone}
                          </div>
                          {patient.email && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Mail className="w-3 h-3" /> {patient.email}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="capitalize">{patient.gender || "-"}</TableCell>
                        <TableCell>
                          {patient.date_of_birth ? format(new Date(patient.date_of_birth), "MMM d, yyyy") : "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(patient.created_at), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(patient)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteItem(patient)}>
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

        <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsDialogOpen(open); }}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingItem ? "Edit Patient" : "Add New Patient"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Full Name *</Label>
                <Input
                  value={formData.full_name}
                  onChange={(e) => setFormData((p) => ({ ...p, full_name: e.target.value }))}
                  placeholder="Enter full name"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Phone *</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="078XXXXXXX"
                    required
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                    placeholder="email@example.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Date of Birth</Label>
                  <Input
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) => setFormData((p) => ({ ...p, date_of_birth: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Gender</Label>
                  <Select value={formData.gender} onValueChange={(v) => setFormData((p) => ({ ...p, gender: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Address</Label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData((p) => ({ ...p, address: e.target.value }))}
                  placeholder="Enter address"
                />
              </div>

              <div>
                <Label>Medical Notes</Label>
                <Textarea
                  value={formData.medical_notes}
                  onChange={(e) => setFormData((p) => ({ ...p, medical_notes: e.target.value }))}
                  placeholder="Any medical notes, allergies, etc."
                  rows={3}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" onClick={resetForm} className="flex-1">Cancel</Button>
                <Button type="submit" className="flex-1">{editingItem ? "Save Changes" : "Add Patient"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!deleteItem} onOpenChange={() => setDeleteItem(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Patient?</AlertDialogTitle>
              <AlertDialogDescription>
                "{deleteItem?.full_name}" will be permanently removed. This cannot be undone if the patient has no appointments.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
}
