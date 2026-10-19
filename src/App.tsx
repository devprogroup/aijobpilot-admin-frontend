import { Navigate, Route, Routes } from "react-router-dom";
import { CrawlerTypesPage } from "./modules/crawler-types/CrawlerTypesPage";
import { ApplicationSitesPage } from "./modules/applications/ApplicationSitesPage";
import { AllApplicationsPage } from "./modules/applications/AllApplicationsPage";
import { ApplicationStatisticsPage } from "./modules/applications/ApplicationStatisticsPage";
import { CrawlerDetailsPage } from "./modules/crawlers/CrawlerDetailsPage";
import { CrawlerFleetPage } from "./modules/crawlers/CrawlerFleetPage";
import { CrawlerSettingsPage } from "./modules/crawlers/CrawlerSettingsPage";
import { CrawledJobsPage } from "./modules/crawlers/CrawledJobsPage";
import { UsersPage } from "./modules/users/UsersPage";
import { UserDetailsPage } from "./modules/users/UserDetailsPage";
import { DashboardPage } from "./modules/dashboard/DashboardPage";
import { ConstantsPage } from "./modules/settings/ConstantsPage";
import { BonusPlansPage } from "./modules/settings/BonusPlansPage";
import { ApiKeysPage } from "./modules/settings/ApiKeysPage";
import { EmailTemplatesPage } from "./modules/email-templates/EmailTemplatesPage";
import { ContentManagementPage } from "./modules/contents/ContentManagementPage";
import { PaymentsPage } from "./modules/payments/PaymentsPage";
import { MessagesPage } from "./modules/messages/MessagesPage";
import { MaintenancePage } from "./modules/maintenance/MaintenancePage";
import { AccountPage } from "./modules/account/AccountPage";
import { PromoCodesPage } from "./modules/promo-codes/PromoCodesPage";
import { LoginPage } from "./auth/LoginPage";
import { ForgotPasswordPage } from "./auth/ForgotPasswordPage";
import { SetAdminPasswordPage } from "./auth/SetAdminPasswordPage";
import { SuperAdminRoute } from "./auth/SuperAdminRoute";
import { PlatformAdminRoute } from "./auth/PlatformAdminRoute";
import { ProtectedLayout } from "./auth/ProtectedLayout";
import { AdminUsersPage } from "./modules/admin-users/AdminUsersPage";
import { ServiceLogsPage } from "./modules/logs/ServiceLogsPage";
import { AdminEmailsPage } from "./modules/admin-emails/AdminEmailsPage";
import { InboundEmailsPage } from "./modules/inbound-emails/InboundEmailsPage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<SetAdminPasswordPage />} />
      <Route element={<ProtectedLayout />}>
        <Route path="/change-password" element={<Navigate to="/account" replace />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/promo-codes" element={<PromoCodesPage />} />
        <Route element={<PlatformAdminRoute />}>
          <Route element={<SuperAdminRoute />}>
            <Route path="/users/admins" element={<AdminUsersPage />} />
            <Route path="/admin-users" element={<Navigate to="/users/admins" replace />} />
            <Route path="/wallets" element={<PaymentsPage />} />
            <Route path="/payments" element={<Navigate to="/wallets" replace />} />
          </Route>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/crawlers/fleets" element={<CrawlerFleetPage />} />
          <Route path="/crawlers/fleets/:crawlerId" element={<CrawlerDetailsPage />} />
          <Route path="/crawlers/types" element={<CrawlerTypesPage />} />
          <Route path="/crawlers/crawled-jobs" element={<CrawledJobsPage />} />
          <Route path="/crawlers/settings" element={<CrawlerSettingsPage />} />
          <Route path="/applications/sites" element={<ApplicationSitesPage />} />
          <Route path="/applications/all" element={<AllApplicationsPage />} />
          <Route path="/applications/failed" element={<Navigate to="/applications/all" replace />} />
          <Route path="/applications/statistics" element={<ApplicationStatisticsPage />} />
          <Route path="/applications" element={<Navigate to="/applications/sites" replace />} />
          <Route path="/application-sites" element={<Navigate to="/applications/sites" replace />} />
          <Route path="/settings" element={<Navigate to="/settings/constants" replace />} />
          <Route path="/settings/constants" element={<ConstantsPage />} />
          <Route path="/settings/bonus-plans" element={<BonusPlansPage />} />
          <Route path="/api-keys" element={<ApiKeysPage />} />
          <Route path="/emails/admin" element={<AdminEmailsPage />} />
          <Route path="/emails/inbound" element={<InboundEmailsPage />} />
          <Route path="/email-templates" element={<EmailTemplatesPage />} />
          <Route path="/contents" element={<Navigate to="/contents/legal" replace />} />
          <Route path="/contents/:section" element={<ContentManagementPage />} />
          <Route path="/legal-content" element={<Navigate to="/contents/legal" replace />} />
          <Route path="/maintenance" element={<MaintenancePage />} />
          <Route path="/users" element={<Navigate to="/users/clients" replace />} />
          <Route path="/users/clients" element={<UsersPage />} />
          <Route path="/users/clients/:userId" element={<UserDetailsPage />} />
          <Route path="/users/:userId" element={<UserDetailsPage />} />
          <Route path="/messages" element={<MessagesPage />} />
          <Route path="/logs" element={<ServiceLogsPage />} />
          <Route path="/emails" element={<Navigate to="/emails/admin" replace />} />
          <Route path="/support" element={<Navigate to="/messages?tab=support" replace />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
