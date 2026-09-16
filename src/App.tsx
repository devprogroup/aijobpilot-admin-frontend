import { Navigate, Route, Routes } from "react-router-dom";
import { CrawlerTypesPage } from "./modules/crawler-types/CrawlerTypesPage";
import { ApplicationSitesPage } from "./modules/applications/ApplicationSitesPage";
import { AllApplicationsPage } from "./modules/applications/AllApplicationsPage";
import { FailedApplicationsPage } from "./modules/applications/FailedApplicationsPage";
import { ApplicationStatisticsPage } from "./modules/applications/ApplicationStatisticsPage";
import { CrawlerDetailsPage } from "./modules/crawlers/CrawlerDetailsPage";
import { CrawlerFleetPage } from "./modules/crawlers/CrawlerFleetPage";
import { CrawlerSettingsPage } from "./modules/crawlers/CrawlerSettingsPage";
import { UsersPage } from "./modules/users/UsersPage";
import { UserDetailsPage } from "./modules/users/UserDetailsPage";
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
        <Route path="/crawlers/settings" element={<CrawlerSettingsPage />} />
        <Route path="/applications/sites" element={<ApplicationSitesPage />} />
        <Route path="/applications/all" element={<AllApplicationsPage />} />
        <Route path="/applications/failed" element={<FailedApplicationsPage />} />
        <Route path="/applications/statistics" element={<ApplicationStatisticsPage />} />
        <Route path="/applications" element={<Navigate to="/applications/sites" replace />} />
        <Route path="/application-sites" element={<Navigate to="/applications/sites" replace />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/users/:userId" element={<UserDetailsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/email-templates" element={<EmailTemplatesPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
