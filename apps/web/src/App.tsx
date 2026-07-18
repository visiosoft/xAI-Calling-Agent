import { Routes, Route, Navigate } from "react-router-dom";
import { DashboardLayout } from "./layouts/DashboardLayout";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { SignupPage } from "./pages/SignupPage";
import { DashboardPage } from "./pages/dashboard/DashboardPage";
import { AgentsPage } from "./pages/dashboard/AgentsPage";
import { AgentNewPage } from "./pages/dashboard/AgentNewPage";
import { AgentDetailPage } from "./pages/dashboard/AgentDetailPage";
import { ContactsPage } from "./pages/dashboard/ContactsPage";
import { ContactListDetailPage } from "./pages/dashboard/ContactListDetailPage";
import { CampaignsPage } from "./pages/dashboard/CampaignsPage";
import { CampaignNewPage } from "./pages/dashboard/CampaignNewPage";
import { CampaignDetailPage } from "./pages/dashboard/CampaignDetailPage";
import { CallDetailPage } from "./pages/dashboard/CallDetailPage";
import { AnalyticsPage } from "./pages/dashboard/AnalyticsPage";
import { SettingsPage } from "./pages/dashboard/SettingsPage";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/dashboard" element={<DashboardLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="agents" element={<AgentsPage />} />
        <Route path="agents/new" element={<AgentNewPage />} />
        <Route path="agents/:id" element={<AgentDetailPage />} />
        <Route path="contacts" element={<ContactsPage />} />
        <Route path="contacts/:id" element={<ContactListDetailPage />} />
        <Route path="campaigns" element={<CampaignsPage />} />
        <Route path="campaigns/new" element={<CampaignNewPage />} />
        <Route path="campaigns/:id" element={<CampaignDetailPage />} />
        <Route path="calls/:id" element={<CallDetailPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
