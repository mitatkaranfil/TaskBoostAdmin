import { createContext, useState, useEffect, ReactNode } from "react";
import { User, UserBoost } from "@/types";
import { authenticateTelegramUser } from "@/lib/telegram";
import { calculateMiningSpeed, isMiningAvailable } from "@/lib/mining";
import LoadingScreen from "@/components/LoadingScreen";

const API_BASE_URL = '/api';

// API çağrıları
async function getUserBoosts(userId: string): Promise<UserBoost[]> {
  const response = await fetch(`${API_BASE_URL}/users/${userId}/boosts`);
  if (!response.ok) {
    throw new Error('Failed to fetch user boosts');
  }
  return await response.json();
}

async function getUserByTelegramId(telegramId: string): Promise<User | null> {
  const response = await fetch(`${API_BASE_URL}/users/telegram/${telegramId}`);
  if (!response.ok) {
    return null;
  }
  return await response.json();
}

interface UserContextType {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  activeBoosts: UserBoost[];
  refreshUser: () => Promise<void>;
  claimMiningRewards: () => Promise<boolean>;
}

export const UserContext = createContext<UserContextType>({
  user: null,
  isLoading: true,
  error: null,
  activeBoosts: [],
  refreshUser: async () => {},
  claimMiningRewards: async () => false,
});

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider = ({ children }: UserProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeBoosts, setActiveBoosts] = useState<UserBoost[]>([]);
  const [initAttempts, setInitAttempts] = useState(0);

  // Initialize user from Telegram
  useEffect(() => {
    const initUser = async () => {
      try {
        setIsLoading(true);
        console.log("UserContext - Initializing user, attempt:", initAttempts + 1);
        
        // Get URL parameters for referral
        const urlParams = new URLSearchParams(window.location.search);
        const referralCode = urlParams.get("ref");
        
        console.log("UserContext - About to authenticate with Telegram");
        // Authenticate with Telegram
        const authenticatedUser = await authenticateTelegramUser(referralCode || undefined);
        
        console.log("UserContext - Authentication result:", authenticatedUser ? "Success" : "Failed");
        
        if (!authenticatedUser) {
          console.error("UserContext - Authentication returned null user");
          
          if (initAttempts < 3) {
            console.log(`UserContext - Retrying authentication (attempt ${initAttempts + 1}/3)`);
            setInitAttempts(prev => prev + 1);
            return;
          }
          
          throw new Error("Authentication failed after multiple attempts");
        }
        
        setUser(authenticatedUser);
        console.log("UserContext - User set:", authenticatedUser);
        
        // Load active boosts
        if (authenticatedUser.id) {
          console.log("UserContext - Loading boosts for user:", authenticatedUser.id);
          try {
            const boosts = await getUserBoosts(authenticatedUser.id);
            console.log("UserContext - Loaded boosts:", boosts.length);
            setActiveBoosts(boosts);
          } catch (boostErr) {
            console.error("UserContext - Error loading boosts:", boostErr);
          }
        }
        
        // Check for mining rewards
        if (authenticatedUser.lastMiningTime && isMiningAvailable(authenticatedUser.lastMiningTime as Date)) {
          console.log("UserContext - Claiming mining rewards");
          try {
            await claimMiningRewards(authenticatedUser);
            console.log("UserContext - Mining rewards claimed");
          } catch (miningErr) {
            console.error("UserContext - Error claiming mining rewards:", miningErr);
          }
        }
        
      } catch (err) {
        console.error("UserContext - Error initializing user:", err);
        setError("Failed to initialize user");
      } finally {
        console.log("UserContext - User initialization completed or failed after max attempts");
        setIsLoading(false);
      }
    };

    initUser();
  }, [initAttempts]);

  // Check for mining rewards
  const claimMiningRewards = async (userToUpdate = user): Promise<boolean> => {
    if (!userToUpdate) return false;
    
    try {
      const lastMining = new Date(userToUpdate.lastMiningTime as Date);
      const now = new Date();
      
      // Calculate hours passed
      const hoursDiff = Math.floor(
        (now.getTime() - lastMining.getTime()) / (1000 * 60 * 60)
      );
      
      if (hoursDiff <= 0) return false;
      
      // Calculate mining speed with boosts
      let miningSpeed = userToUpdate.miningSpeed;
      
      // Apply boost multipliers
      for (const boost of activeBoosts) {
        miningSpeed = Math.floor(
          miningSpeed * (boost.boostType!.multiplier / 100)
        );
      }
      
      // Calculate earned points
      const earnedPoints = hoursDiff * miningSpeed;
      
      // Update points and last mining time via API
      const response = await fetch(`${API_BASE_URL}/users/${userToUpdate.id}/mining-claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          earnedPoints,
          miningTime: new Date().toISOString()
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update mining rewards');
      }
      
      // Refresh user
      await refreshUser();
      
      return true;
    } catch (err) {
      console.error("Error claiming mining rewards:", err);
      return false;
    }
  };

  // Refresh user data
  const refreshUser = async (): Promise<void> => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      
      // Get fresh user data from API
      const refreshedUser = await getUserByTelegramId(user.telegramId);
      
      if (!refreshedUser) {
        throw new Error("Failed to refresh user");
      }
      
      setUser(refreshedUser);
      
      // Refresh active boosts
      if (refreshedUser.id) {
        const boosts = await getUserBoosts(refreshedUser.id);
        setActiveBoosts(boosts);
      }
      
    } catch (err) {
      console.error("Error refreshing user:", err);
      setError("Failed to refresh user data");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !user) {
    return <LoadingScreen message="Telegram'a bağlanıyor..." />;
  }

  return (
    <UserContext.Provider
      value={{
        user,
        isLoading,
        error,
        activeBoosts,
        refreshUser,
        claimMiningRewards,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};
