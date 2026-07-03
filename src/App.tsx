import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import AIChatWidget from "@/components/chat/AIChatWidget";
import Index from "./pages/Index";
import About from "./pages/About";
import ServicesPage from "./pages/Services";
import Doctors from "./pages/Doctors";
import Contact from "./pages/Contact";
import Gallery from "./pages/Gallery";
import BookAppointment from "./pages/BookAppointment";
import PatientPortal from "./pages/patient/PatientPortal";
import PatientLogin from "./pages/patient/PatientLogin";
import PatientRegister from "./pages/patient/PatientRegister";
import AdminLogin from "./pages/admin/AdminLogin";
import Dashboard from "./pages/admin/Dashboard";
import StaffManagement from "./pages/admin/StaffManagement";
import StaffAccounts from "./pages/admin/StaffAccounts";
import GalleryManagement from "./pages/admin/GalleryManagement";
import CalendarPage from "./pages/admin/Calendar";
import Appointments from "./pages/admin/Appointments";
import Patients from "./pages/admin/Patients";
import Services from "./pages/admin/Services";
import Settings from "./pages/admin/Settings";
import Messages from "./pages/admin/Messages";
import BlogManagement from "./pages/admin/BlogManagement";
import AnnouncementsManagement from "./pages/admin/AnnouncementsManagement";
import Triage from "./pages/admin/Triage";
import AuditLogs from "./pages/admin/AuditLogs";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import NotFound from "./pages/NotFound";
import SetPassword from "./pages/auth/SetPassword";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Index />} />
            <Route path="/about" element={<About />} />
            <Route path="/services" element={<ServicesPage />} />
            <Route path="/doctors" element={<Doctors />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/book" element={<BookAppointment />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<BlogPost />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
            
            {/* Patient Portal Routes */}
            <Route path="/patient/portal" element={<PatientPortal />} />
            <Route path="/patient/login" element={<PatientLogin />} />
            <Route path="/patient/register" element={<PatientRegister />} />
            
            {/* Admin Routes */}
            <Route path="/admin" element={<AdminLogin />} />
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/staff"
              element={
                <ProtectedRoute allowedRoles={["super_admin", "manager"]}>
                  <StaffManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/staff-accounts"
              element={
                <ProtectedRoute allowedRoles={["super_admin", "manager"]}>
                  <StaffAccounts />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/gallery"
              element={
                <ProtectedRoute allowedRoles={["super_admin"]}>
                  <GalleryManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/calendar"
              element={
                <ProtectedRoute>
                  <CalendarPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/appointments"
              element={
                <ProtectedRoute>
                  <Appointments />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/patients"
              element={
                <ProtectedRoute>
                  <Patients />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/services"
              element={
                <ProtectedRoute allowedRoles={["super_admin"]}>
                  <Services />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/settings"
              element={
                <ProtectedRoute allowedRoles={["super_admin"]}>
                  <Settings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/messages"
              element={
                <ProtectedRoute allowedRoles={["super_admin", "receptionist"]}>
                  <Messages />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/blog"
              element={
                <ProtectedRoute allowedRoles={["super_admin"]}>
                  <BlogManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/announcements"
              element={
                <ProtectedRoute allowedRoles={["super_admin"]}>
                  <AnnouncementsManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/triage"
              element={
                <ProtectedRoute allowedRoles={["super_admin", "receptionist", "dentist"]}>
                  <Triage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/audit-logs"
              element={
                <ProtectedRoute allowedRoles={["super_admin"]}>
                  <AuditLogs />
                </ProtectedRoute>
              }
            />

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <AIChatWidget />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
