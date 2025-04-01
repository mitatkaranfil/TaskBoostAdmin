import { useState, useEffect } from "react";
import { getTasks, getUserTasks, updateUserTaskProgress, incrementUserTaskProgress } from "@/lib/supabase";
import { Task, UserTask, TaskFilter } from "@/types";
import useUser from "./useUser";
import { useToast } from "@/hooks/use-toast";
import { openTelegramLink, hapticFeedback } from "@/lib/telegram";

export const useTasks = () => {
  const { user, refreshUser } = useUser();
  const { toast } = useToast();
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [userTasks, setUserTasks] = useState<UserTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<TaskFilter>("all");
  
  // Load tasks
  useEffect(() => {
    loadTasks();
  }, [user]);
  
  // Görevleri yükleme fonksiyonu
  const loadTasks = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      
      // Get all tasks from Supabase
      try {
        console.log("Loading tasks from Supabase");
        const tasksData = await getTasks();
        console.log("Tasks loaded from Supabase:", tasksData);
        setTasks(tasksData);
      } catch (error) {
        console.error("Error loading tasks from Supabase:", error);
        toast({
          title: "Hata",
          description: "Görevler yüklenirken bir hata oluştu.",
          variant: "destructive"
        });
      }
      
      // Get user's progress on tasks
      try {
        console.log("Loading user tasks from Supabase");
        const userTasksData = await getUserTasks(user.id);
        console.log("User tasks loaded from Supabase:", userTasksData);
        setUserTasks(userTasksData);
      } catch (error) {
        console.error("Error loading user tasks from Supabase:", error);
        toast({
          title: "Hata",
          description: "Kullanıcı görevleri yüklenirken bir hata oluştu.",
          variant: "destructive"
        });
      }
      
    } catch (error) {
      console.error("Error loading tasks:", error);
      toast({
        title: "Hata",
        description: "Görevler yüklenirken bir hata oluştu.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Filter tasks based on active filter
  const filteredTasks = tasks.filter(task => {
    if (activeFilter === "all") return true;
    return task.type === activeFilter;
  });
  
  // Get user progress for a task
  const getUserTaskProgress = (taskId: string): UserTask | undefined => {
    return userTasks.find(ut => ut.taskId === taskId);
  };
  
  // Handle task action (e.g., navigating to Telegram group)
  const handleTaskAction = async (task: Task) => {
    if (!user) return;
    
    try {
      console.log("Handling task action for task:", task);
      
      // Handle different task actions
      switch (task.telegramAction) {
        case "open_app":
          // Auto-complete this task as the app is already open
          try {
            console.log("Handling open_app task");
            await updateUserTaskProgress(user.id, task.id, task.requiredAmount);
            await refreshUser();
            hapticFeedback("success");
            toast({
              title: "Görev Tamamlandı",
              description: `${task.points} puan kazandınız!`,
              variant: "default"
            });
          } catch (error) {
            console.error("Error updating task progress:", error);
            toast({
              title: "Hata",
              description: "Görev güncellenirken bir hata oluştu.",
              variant: "destructive"
            });
          }
          break;
          
        case "send_message":
          if (task.telegramTarget) {
            try {
              console.log("Handling send_message task");
              // Open the Telegram link and attempt to mark as complete
              openTelegramLink(task.telegramTarget);
              
              // Update task progress
              await updateUserTaskProgress(user.id, task.id, 1);
              await refreshUser();
              toast({
                title: "Görev İlerlemesi",
                description: "Görev ilerlemesi güncellendi.",
              });
            } catch (error) {
              console.error("Error handling send_message task:", error);
              toast({
                title: "Hata",
                description: "Görev işlenirken bir hata oluştu.",
                variant: "destructive"
              });
            }
          }
          break;
          
        case "join_channel":
          if (task.telegramTarget) {
            try {
              console.log("Handling join_channel task");
              
              // Open the Telegram link
              openTelegramLink(task.telegramTarget);
              
              // Mark task as complete
              await updateUserTaskProgress(user.id, task.id, task.requiredAmount);
              await refreshUser();
              toast({
                title: "Görev Tamamlanıyor",
                description: "Kanala katıldıktan sonra görev tamamlanacak",
              });
            } catch (error) {
              console.error("Error handling join_channel task:", error);
              toast({
                title: "Hata",
                description: "Görev işlenirken bir hata oluştu.",
                variant: "destructive"
              });
            }
          }
          break;
          
        case "invite_friends":
          // This will be handled by a different component
          break;
          
        default:
          // İlerleme tabanlı görevler için (telegramAction olmayan veya özel olmayan görevler)
          try {
            console.log("Handling progress-based task");
            // Bir birim ilerleme kaydedelim
            const result = await incrementTaskProgress(parseInt(task.id, 10), 1);
            console.log("Task progress result:", result);
            toast({
              title: "İlerleme Kaydedildi",
              description: "Görev ilerlemesi güncellendi.",
            });
            
            // Eğer görev tamamlandıysa kullanıcıyı güncelleyelim
            if (result && result.isCompleted) {
              console.log("Task completed, refreshing user");
              await refreshUser();
              toast({
                title: "Görev Tamamlandı",
                description: `${task.points} puan kazandınız!`,
                variant: "default"
              });
            }
          } catch (error) {
            console.error("Error handling progress task:", error);
            toast({
              title: "Hata",
              description: "Görev ilerlemesi kaydedilirken bir hata oluştu.",
              variant: "destructive"
            });
          }
          break;
      }
      
      // Update user tasks after task action
      await loadTasks();
      
    } catch (error) {
      console.error("Error handling task action:", error);
      toast({
        title: "Hata",
        description: "Görev işlenirken bir hata oluştu.",
        variant: "destructive"
      });
    }
  };
  
  // İlerleme tabanlı görevler için ilerleme arttırma
  const incrementTaskProgress = async (taskId: string | number, amount: number = 1) => {
    if (!user) return;
    
    try {
      const taskIdStr = typeof taskId === 'number' ? taskId.toString() : taskId;
      console.log(`Incrementing task ${taskIdStr} for user ${user.id}, amount: ${amount}`);
      
      const result = await incrementUserTaskProgress(user.id, taskIdStr, amount);
      
      // Kullanıcı görevlerini yenile
      await loadTasks();
      
      // Eğer görev tamamlandıysa kullanıcıyı bilgilendir
      if (result && result.isCompleted) {
        const task = tasks.find(t => t.id === taskIdStr);
        if (task) {
          hapticFeedback("success");
          toast({
            title: "Görev Tamamlandı",
            description: `${task.points} puan kazandınız!`,
            variant: "default"
          });
          await refreshUser();
        }
      }
      
      return result;
    } catch (error) {
      console.error("Error incrementing task progress:", error);
      toast({
        title: "Hata",
        description: "Görev ilerlemesi güncellenirken bir hata oluştu.",
        variant: "destructive"
      });
      return null;
    }
  };
  
  // Update task progress
  const updateTaskProgress = async (taskId: string, progress: number) => {
    if (!user) return;
    
    try {
      await updateUserTaskProgress(user.id, taskId, progress);
      await refreshUser();
      
      // Reload user tasks
      await loadTasks();
      
    } catch (error) {
      console.error("Error updating task progress:", error);
      toast({
        title: "Hata",
        description: "Görev ilerlemesi güncellenirken bir hata oluştu.",
        variant: "destructive"
      });
    }
  };
  
  return {
    tasks: filteredTasks,
    userTasks,
    isLoading,
    activeFilter,
    setActiveFilter,
    getUserTaskProgress,
    handleTaskAction,
    updateTaskProgress,
    incrementTaskProgress,
    loadTasks
  };
};

export default useTasks;
