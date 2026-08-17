import { Navigate, Route, Routes } from "react-router-dom";
import { CrawlerTypesPage } from "./modules/crawler-types/CrawlerTypesPage";
import { CrawlerDetailsPage } from "./modules/crawlers/CrawlerDetailsPage";
import { CrawlerFleetPage } from "./modules/crawlers/CrawlerFleetPage";
import { UsersPage } from "./modules/users/UsersPage";
import { DashboardPage } from "./modules/dashboard/DashboardPage";
import { SettingsPage } from "./modules/settings/SettingsPage";
import { EmailTemplatesPage } from "./modules/email-templates/EmailTemplatesPage";
import { LoginPage } from "./auth/LoginPage";
import { ProtectedLayout } from "./auth/ProtectedLayout";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/crawlers/fleets" element={<CrawlerFleetPage />} />
        <Route
          path="/crawlers/fleets/:crawlerId"
          element={<CrawlerDetailsPage />}
        />
        <Route path="/crawlers/types" element={<CrawlerTypesPage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/email-templates" element={<EmailTemplatesPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
