
import React, { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import AdminProjects from "./pages/AdminProjects";
import AdminSettings from "./pages/AdminSettings";
import AdminPromotions from "./pages/AdminPromotions";
import AdminLayout from "./components/AdminLayout";
import CustomCursor from "./components/CustomCursor";
import { AIContextProvider, useAI } from "./context/AIContext";
import VideoBridge from "./components/VideoBridge";

const AICorePortal = lazy(() => import("./components/AICorePortal"));

const queryClient = new QueryClient();

const AppContent = () => {
  const { aiModeState } = useAI();

  return (
    <TooltipProvider>
      <CustomCursor />
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Admin />} />
            <Route path="projects" element={<AdminProjects />} />
            <Route path="promotions" element={<AdminPromotions />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>

      {aiModeState !== 'inactive' && (
        <Suspense fallback={null}>
          <AICorePortal />
        </Suspense>
      )}
      <VideoBridge />
    </TooltipProvider>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AIContextProvider>
        <AppContent />
      </AIContextProvider>
    </QueryClientProvider>
  );
};

export default App;

