import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { ThemeProvider } from "@/components/theme";
import { Layout } from "@/components/layout";
import { ProtectedRoute } from "@/components/protected";
import { LoginPage } from "@/pages/login";
import { CandidatesListPage } from "@/pages/candidates-list";
import { CandidateNewPage } from "@/pages/candidate-new";
import { CandidateDetailPage } from "@/pages/candidate-detail";

export default function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/" element={<Navigate to="/candidates" replace />} />
                <Route path="/candidates" element={<CandidatesListPage />} />
                <Route path="/candidates/new" element={<CandidateNewPage />} />
                <Route path="/candidates/:id" element={<CandidateDetailPage />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
