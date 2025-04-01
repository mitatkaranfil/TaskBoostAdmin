import { useEffect, useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { UserProvider } from "@/context/UserContext";
import Home from "@/pages/home";
import Admin from "@/pages/admin";
import NotFound from "@/pages/not-found";
import LoadingScreen from "@/components/LoadingScreen";
import { initializeTelegramApp } from "./lib/telegram";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/admin" component={Admin} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        console.log("App initialization started");
        
        // Initialize Telegram WebApp
        initializeTelegramApp();
        
        // Test database connection
        const response = await fetch('/api/health');
        const data = await response.json();
        
        if (data.status === 'ok') {
          console.log("Database connection successful");
        } else {
          console.error("Database connection failed");
        }
        
        console.log("App initialization complete");
        setIsInitialized(true);
        setInitError(null);
      } catch (error) {
        console.error("Failed to initialize app:", error);
        setInitError("Uygulama başlatılırken bir hata oluştu");
        // Proceed with the app anyway
        setIsInitialized(true);
      }
    };

    init();
  }, []);

  // If we're still initializing, show loading screen
  if (!isInitialized) {
    return (
      <LoadingScreen 
        message={initError ? `${initError}...` : "Uygulama yükleniyor..."} 
      />
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <UserProvider>
        <Router />
        <Toaster />
      </UserProvider>
    </QueryClientProvider>
  );
}

export default App;
