import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { CrawlerTypesPage } from "./modules/crawler-types/CrawlerTypesPage";
import { CrawlerDetailsPage } from "./modules/crawlers/CrawlerDetailsPage";
import { CrawlerFleetPage } from "./modules/crawlers/CrawlerFleetPage";
import { UsersPage } from "./modules/users/UsersPage";

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/crawlers/fleets" element={<CrawlerFleetPage />} />
        <Route
          path="/crawlers/fleets/:crawlerId"
          element={<CrawlerDetailsPage />}
        />
        <Route path="/crawlers/types" element={<CrawlerTypesPage />} />
        <Route path="/users" element={<UsersPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/crawlers/fleets" replace />} />
    </Routes>
  );
}
