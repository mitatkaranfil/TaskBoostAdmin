import { useState, useEffect } from "react";
import { getBoostTypes, createUserBoost } from "@/lib/supabase";
import { BoostType } from "@/types";
import useUser from "./useUser";
import { useToast } from "@/hooks/use-toast";
import { showConfirm, hapticFeedback } from "@/lib/telegram";
import { formatBoostRemainingTime, calculatePotentialEarnings } from "@/lib/mining";

export const useBoosts = () => {
  const { user, activeBoosts, refreshUser } = useUser();
  const { toast } = useToast();
  
  const [boostTypes, setBoostTypes] = useState<BoostType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Load boost types
  useEffect(() => {
    const loadBoostTypes = async () => {
      try {
        setIsLoading(true);
        
        // Load boost types from Supabase
        try {
          console.log("Loading boost types from Supabase");
          const boostData = await getBoostTypes();
          console.log("Boost types loaded from Supabase:", boostData);
          setBoostTypes(boostData);
        } catch (error) {
          console.error("Error loading boost types from Supabase:", error);
          toast({
            title: "Hata",
            description: "Boost tipleri yüklenirken bir hata oluştu.",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error("Error loading boost types:", error);
        toast({
          title: "Hata",
          description: "Boost tipleri yüklenirken bir hata oluştu.",
          variant: "destructive"
        });
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
      const boostType = boostTypes.find(bt => bt.id === boostTypeId);
      
      if (!boostType) {
        throw new Error("Boost type not found");
      }
      
      // Check if user has enough points
      if (user.points < boostType.price) {
        toast({
          title: "Yetersiz Puan",
          description: `Bu boost için ${boostType.price} puana ihtiyacınız var.`,
          variant: "destructive"
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
      await createUserBoost({
        user_id: user.id,
        boost_type_id: boostTypeId,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
      // Success
      hapticFeedback("success");
      toast({
        title: "Boost Satın Alındı",
        description: `${boostType.name} başarıyla aktifleştirildi!`,
        variant: "default"
      });
      
      // Refresh user data and boosts
      await refreshUser();
      
    } catch (error) {
      console.error("Error purchasing boost:", error);
      hapticFeedback("error");
      toast({
        title: "Satın Alma Hatası",
        description: "Boost satın alınırken bir hata oluştu.",
        variant: "destructive"
      });
    }
  };
  
  // Get formatted remaining time for active boosts
  const getBoostRemainingTimes = () => {
    return activeBoosts.map(boost => ({
      ...boost,
      formattedRemainingTime: formatBoostRemainingTime(boost.endTime as Date)
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
    getPotentialEarnings
  };
};

export default useBoosts;
