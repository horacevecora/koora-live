import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import PlayerPage from "./pages/PlayerPage";
import RealPlayer from "./pages/RealPlayer";
import AdminPanel from "./pages/AdminPanel";
import Login from "./pages/Login";
import Matches from "./pages/Matches";
import ExternalScripts from "./components/ExternalScripts";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <HelmetProvider>
      <TooltipProvider>
        <ExternalScripts />
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/matches" element={<Matches />} />
            <Route path="/player" element={<PlayerPage />} />
            <Route path="/real.html" element={<RealPlayer />} />
            <Route path="/p/:slug" element={<RealPlayer />} />
            <Route path="/admin" element={<AdminPanel />} />
            <Route path="/login" element={<Login />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </HelmetProvider>
  </QueryClientProvider>
);

export default App;