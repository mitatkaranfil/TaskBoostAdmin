import { useState, useEffect } from "react";
import { BoostType, UserBoost } from "@/types";
import { API_BASE_URL } from "@/lib/constants";
import useUser from "./useUser";
import { useToast } from "@/hooks/use-toast";
import { showConfirm, hapticFeedback } from "@/lib/telegram";
import { formatBoostRemainingTime, calculatePotentialEarnings } from "@/lib/mining";

// API çağrıları
async function getBoostTypes(): Promise<BoostType[]> {
  const response = await fetch(`${API_BASE_URL}/boosts`);
  if (!response.ok) {
    throw new Error("Failed to fetch boost types");
  }
  return await response.json();
}

async function createUserBoost(userId: string, boostId: string): Promise<UserBoost> {
  const response = await fetch(`${API_BASE_URL}/user-boosts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, boostId }),
  });
  if (!response.ok) {
    throw new Error("Failed to create user boost");
  }
  return await response.json();
}

export const useBoosts = () => {
  const { user, activeBoosts, refreshUser } = useUser();
  const { toast } = useToast();

  const [boostTypes, setBoostTypes] = useState<BoostType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load boost types
  useEffect(() => {
    const loadBoostTypes = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Load boost types from API
        const boostData = await getBoostTypes();
        setBoostTypes(boostData);
      } catch (err) {
        console.error("Error loading boost types:", err);
        setError("Failed to load boost types");
      } finally {
        setIsLoading(false);
      }
    };

    loadBoostTypes();
  }, [toast]);

  // Process boost purchase
  const buyBoost = async (boostTypeId: string) => {
    if (!user) return;

    try {
      // Find boost type
      const boostType = boostTypes.find((bt) => bt.id === boostTypeId);

      if (!boostType) {
        throw new Error("Boost type not found");
      }

      // Check if user has enough points
      if (user.points < boostType.price) {
        toast({
          title: "Yetersiz Puan",
          description: `Bu boost için ${boostType.price} puana ihtiyacınız var.`,
          variant: "destructive",
        });
        return;
      }

      // Confirm purchase
      const confirmed = await showConfirm(
        `${boostType.name} satın almak istiyor musunuz? Bu işlem ${boostType.price} puan harcayacak.`
      );

      if (!confirmed) return;

      // Calculate start and end times
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + boostType.durationHours * 60 * 60 * 1000);

      // Create user boost
      await createUserBoost(user.id, boostTypeId);

      // Success
      hapticFeedback("success");
      toast({
        title: "Boost Satın Alındı",
        description: `${boostType.name} başarıyla aktifleştirildi!`,
        variant: "default",
      });

      // Refresh user data and boosts
      await refreshUser();
    } catch (error) {
      console.error("Error purchasing boost:", error);
      hapticFeedback("error");
      toast({
        title: "Satın Alma Hatası",
        description: "Boost satın alınırken bir hata oluştu.",
        variant: "destructive",
      });
    }
  };

  // Get formatted remaining time for active boosts
  const getBoostRemainingTimes = () => {
    return activeBoosts.map((boost) => ({
      ...boost,
      formattedRemainingTime: formatBoostRemainingTime(boost.endTime as Date),
    }));
  };

  // Calculate and format potential earnings for each boost
  const getPotentialEarnings = (boostType: BoostType) => {
    if (!user) return 0;

    const baseSpeed = user.miningSpeed;
    return calculatePotentialEarnings(
      baseSpeed,
      boostType.multiplier,
      boostType.durationHours
    );
  };

  return {
    boostTypes,
    isLoading,
    buyBoost,
    getBoostRemainingTimes,
    getPotentialEarnings,
  };
};

export default useBoosts;
