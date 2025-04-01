import express, { type Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./index";
import pool from "./db";
import { 
  insertUserSchema, 
  insertTaskSchema, 
  insertUserTaskSchema,
  insertBoostTypeSchema,
  insertUserBoostSchema,
  insertReferralSchema
} from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { nanoid } from "nanoid";

export async function registerRoutes(app: Express): Promise<Server> {
  const router = express.Router();
  
  // Middleware to handle Zod validation errors
  const validateRequest = (schema: any) => (req: Request, res: Response, next: Function) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ message: validationError.message });
      } else {
        res.status(400).json({ message: "Invalid request data" });
      }
    }
  };

  // User Routes
  router.post("/users", async (req, res) => {
    try {
      // Special logic for test user
      if (req.body.telegramId === "123456789") {
        console.log("Creating test user with data:", JSON.stringify(req.body));
        
        // Create test user in the database
        const testUserData = {
          telegramId: "123456789",
          firstName: "Test",
          lastName: "User",
          username: "testuser",
          photoUrl: "https://ui-avatars.com/api/?name=Test+User&background=random",
          referralCode: "TEST123",
          level: 1,
          points: 0,
          miningSpeed: 10,
          lastMiningTime: new Date(),
          joinDate: new Date(),
          completedTasksCount: 0,
          boostUsageCount: 0
        };
        
        // Delete the existing test user if it exists (to avoid conflicts)
        try {
          await pool.query('DELETE FROM users WHERE telegram_id = $1', ["123456789"]);
        } catch (deleteError) {
          console.log("No existing test user to delete or error deleting:", deleteError);
        }
        
        // Insert the test user into the database
        const user = await storage.createUser(testUserData);
        
        console.log("Test user created in database:", JSON.stringify(user));
        return res.status(201).json(user);
      } else {
        // Regular validation for real users
        try {
          insertUserSchema.parse(req.body);
        } catch (validationError) {
          if (validationError instanceof ZodError) {
            const error = fromZodError(validationError);
            return res.status(400).json({ message: error.message });
          } else {
            return res.status(400).json({ message: "Invalid request data" });
          }
        }
      }
      
      const telegramId = req.body.telegramId;
      // Check if user already exists
      const existingUser = await storage.getUserByTelegramId(telegramId);
      if (existingUser) {
        return res.json(existingUser);
      }
      
      // Generate referral code
      const referralCode = req.body.referralCode || nanoid(8);
      
      // Create new user
      const user = await storage.createUser({
        ...req.body,
        referralCode
      });
      
      // Handle referred_by if present
      if (req.body.referredBy) {
        const referrers = await storage.getUsersByReferralCode(req.body.referredBy);
        if (referrers.length > 0) {
          const referrer = referrers[0];
          // Create referral record
          await storage.createReferral({
            referrerId: referrer.id,
            referredId: user.id,
            points: 100
          });
        }
      }
      
      res.status(201).json(user);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Error creating user" });
    }
  });
  
  router.get("/users/:telegramId", async (req, res) => {
    try {
      const { telegramId } = req.params;
      const user = await storage.getUserByTelegramId(telegramId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Check for pending mining rewards
      const now = new Date();
      const lastMining = new Date(user.lastMiningTime);
      const hoursDiff = Math.floor((now.getTime() - lastMining.getTime()) / (1000 * 60 * 60));
      
      if (hoursDiff > 0) {
        // Calculate base mining rewards
        let miningSpeed = user.miningSpeed;
        
        // Get active boosts to adjust mining speed
        const activeBoosts = await storage.getUserActiveBoosts(user.id);
        
        // Apply boost multipliers
        for (const boost of activeBoosts) {
          miningSpeed = Math.floor(miningSpeed * (boost.boostType.multiplier / 100));
        }
        
        // Calculate earned points
        const earnedPoints = hoursDiff * miningSpeed;
        
        // Update user's points and last mining time
        await storage.updateUserPoints(user.id, earnedPoints);
        await storage.updateUserLastMiningTime(user.id);
        
        // Get updated user
        const updatedUser = await storage.getUserById(user.id);
        if (updatedUser) {
          // Include referral count in response
          const referralCount = await storage.getReferralCount(user.id);
          return res.json({ ...updatedUser, referralCount });
        }
      }
      
      // Include referral count in response
      const referralCount = await storage.getReferralCount(user.id);
      res.json({ ...user, referralCount });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Error fetching user" });
    }
  });
  
  // Tasks Routes
  router.get("/tasks", async (req, res) => {
    try {
      const { type } = req.query;
      const tasks = await storage.getTasks(type as string | undefined);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ message: "Error fetching tasks" });
    }
  });
  
  router.post("/tasks", validateRequest(insertTaskSchema), async (req, res) => {
    try {
      const task = await storage.createTask(req.body);
      res.status(201).json(task);
    } catch (error) {
      console.error("Error creating task:", error);
      res.status(500).json({ message: "Error creating task" });
    }
  });
  
  router.put("/tasks/:id", validateRequest(insertTaskSchema.partial()), async (req, res) => {
    try {
      const { id } = req.params;
      const task = await storage.updateTask(parseInt(id, 10), req.body);
      
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      res.json(task);
    } catch (error) {
      console.error("Error updating task:", error);
      res.status(500).json({ message: "Error updating task" });
    }
  });
  
  // Added PATCH endpoint for tasks to support the admin UI
  router.patch("/tasks/:id", validateRequest(insertTaskSchema.partial()), async (req, res) => {
    try {
      console.log("PATCH task with ID:", req.params.id, "and data:", JSON.stringify(req.body));
      const { id } = req.params;
      const task = await storage.updateTask(parseInt(id, 10), req.body);
      
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      res.json(task);
    } catch (error) {
      console.error("Error updating task:", error);
      res.status(500).json({ message: "Error updating task" });
    }
  });
  
  router.delete("/tasks/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteTask(parseInt(id, 10));
      
      if (!success) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting task:", error);
      res.status(500).json({ message: "Error deleting task" });
    }
  });
  
  // User Tasks Routes
  router.get("/users/:userId/tasks", async (req, res) => {
    try {
      const { userId } = req.params;
      const userTasks = await storage.getUserTasks(parseInt(userId, 10));
      res.json(userTasks);
    } catch (error) {
      console.error("Error fetching user tasks:", error);
      res.status(500).json({ message: "Error fetching user tasks" });
    }
  });
  
  router.post("/users/:userId/tasks/:taskId/progress", async (req, res) => {
    try {
      const { userId, taskId } = req.params;
      const { progress } = req.body;
      
      // Check if user task exists, create if not
      let userTask = await storage.getUserTaskById(parseInt(userId, 10), parseInt(taskId, 10));
      
      if (!userTask) {
        userTask = await storage.createUserTask({
          userId: parseInt(userId, 10),
          taskId: parseInt(taskId, 10)
        });
      }
      
      // Update progress
      const updatedUserTask = await storage.updateUserTaskProgress(
        parseInt(userId, 10),
        parseInt(taskId, 10),
        progress
      );
      
      if (!updatedUserTask) {
        return res.status(404).json({ message: "User task not found" });
      }
      
      res.json(updatedUserTask);
    } catch (error) {
      console.error("Error updating task progress:", error);
      res.status(500).json({ message: "Error updating task progress" });
    }
  });
  
  router.post("/users/:userId/tasks/:taskId/complete", async (req, res) => {
    try {
      const { userId, taskId } = req.params;
      
      // Check if user task exists, create if not
      let userTask = await storage.getUserTaskById(parseInt(userId, 10), parseInt(taskId, 10));
      
      if (!userTask) {
        userTask = await storage.createUserTask({
          userId: parseInt(userId, 10),
          taskId: parseInt(taskId, 10)
        });
      }
      
      // Complete the task
      const completedUserTask = await storage.completeUserTask(
        parseInt(userId, 10),
        parseInt(taskId, 10)
      );
      
      if (!completedUserTask) {
        return res.status(404).json({ message: "User task not found" });
      }
      
      res.json(completedUserTask);
    } catch (error) {
      console.error("Error completing task:", error);
      res.status(500).json({ message: "Error completing task" });
    }
  });
  
  // Boost Types Routes
  router.get("/boosts", async (req, res) => {
    try {
      const boostTypes = await storage.getBoostTypes();
      res.json(boostTypes);
    } catch (error) {
      console.error("Error fetching boost types:", error);
      res.status(500).json({ message: "Error fetching boost types" });
    }
  });
  
  router.post("/boosts", validateRequest(insertBoostTypeSchema), async (req, res) => {
    try {
      const boostType = await storage.createBoostType(req.body);
      res.status(201).json(boostType);
    } catch (error) {
      console.error("Error creating boost type:", error);
      res.status(500).json({ message: "Error creating boost type" });
    }
  });
  
  router.put("/boosts/:id", validateRequest(insertBoostTypeSchema.partial()), async (req, res) => {
    try {
      const { id } = req.params;
      const boostType = await storage.updateBoostType(parseInt(id, 10), req.body);
      
      if (!boostType) {
        return res.status(404).json({ message: "Boost type not found" });
      }
      
      res.json(boostType);
    } catch (error) {
      console.error("Error updating boost type:", error);
      res.status(500).json({ message: "Error updating boost type" });
    }
  });
  
  // Added PATCH endpoint for boosts to support the admin UI
  router.patch("/boosts/:id", validateRequest(insertBoostTypeSchema.partial()), async (req, res) => {
    try {
      console.log("PATCH boost with ID:", req.params.id, "and data:", JSON.stringify(req.body));
      const { id } = req.params;
      const boostType = await storage.updateBoostType(parseInt(id, 10), req.body);
      
      if (!boostType) {
        return res.status(404).json({ message: "Boost type not found" });
      }
      
      res.json(boostType);
    } catch (error) {
      console.error("Error updating boost type:", error);
      res.status(500).json({ message: "Error updating boost type" });
    }
  });
  
  router.delete("/boosts/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteBoostType(parseInt(id, 10));
      
      if (!success) {
        return res.status(404).json({ message: "Boost type not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting boost type:", error);
      res.status(500).json({ message: "Error deleting boost type" });
    }
  });
  
  // User Boosts Routes
  router.get("/users/:userId/boosts", async (req, res) => {
    try {
      const { userId } = req.params;
      const { active } = req.query;
      
      if (active === 'true') {
        const activeBoosts = await storage.getUserActiveBoosts(parseInt(userId, 10));
        return res.json(activeBoosts);
      }
      
      const userBoosts = await storage.getUserBoosts(parseInt(userId, 10));
      res.json(userBoosts);
    } catch (error) {
      console.error("Error fetching user boosts:", error);
      res.status(500).json({ message: "Error fetching user boosts" });
    }
  });
  
  router.post("/users/:userId/boosts", validateRequest(insertUserBoostSchema), async (req, res) => {
    try {
      const { userId } = req.params;
      const { boostTypeId } = req.body;
      
      // Verify user exists
      const user = await storage.getUserById(parseInt(userId, 10));
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Verify boost type exists
      const boostType = await storage.getBoostTypeById(parseInt(boostTypeId, 10));
      if (!boostType) {
        return res.status(404).json({ message: "Boost type not found" });
      }
      
      // Check if user has enough points
      if (user.points < boostType.price) {
        return res.status(400).json({ message: "Insufficient points" });
      }
      
      // Deduct points
      await storage.updateUserPoints(user.id, -boostType.price);
      
      // Calculate end time
      const endTime = new Date();
      endTime.setHours(endTime.getHours() + boostType.durationHours);
      
      // Create user boost
      const userBoost = await storage.createUserBoost({
        userId: parseInt(userId, 10),
        boostTypeId: parseInt(boostTypeId, 10),
        endTime
      });
      
      // Get updated user for response
      const updatedUser = await storage.getUserById(user.id);
      
      res.status(201).json({
        userBoost,
        user: updatedUser
      });
    } catch (error) {
      console.error("Error purchasing boost:", error);
      res.status(500).json({ message: "Error purchasing boost" });
    }
  });
  
  // Referral Routes
  router.get("/users/:userId/referrals", async (req, res) => {
    try {
      const { userId } = req.params;
      const referrals = await storage.getReferrals(parseInt(userId, 10));
      res.json(referrals);
    } catch (error) {
      console.error("Error fetching referrals:", error);
      res.status(500).json({ message: "Error fetching referrals" });
    }
  });
  
  // Admin Route for Task Management
  router.get("/admin/tasks", async (req, res) => {
    try {
      const tasks = await storage.getTasks();
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching admin tasks:", error);
      res.status(500).json({ message: "Error fetching admin tasks" });
    }
  });
  
  // Admin Route for Task Creation
  router.post("/admin/tasks", validateRequest(insertTaskSchema), async (req, res) => {
    try {
      const task = await storage.createTask(req.body);
      res.status(201).json(task);
    } catch (error) {
      console.error("Error creating admin task:", error);
      res.status(500).json({ message: "Error creating admin task" });
    }
  });
  
  // Telegram görevleri oluşturmak için yeni endpoint
  router.post("/admin/tasks/telegram", async (req, res) => {
    try {
      const tasks = await storage.createTelegramTasks();
      res.status(201).json({ 
        message: "Telegram görevleri başarıyla oluşturuldu", 
        count: tasks.length,
        tasks 
      });
    } catch (error) {
      console.error("Error creating Telegram tasks:", error);
      res.status(500).json({ message: "Error creating Telegram tasks" });
    }
  });
  
  // Admin Route for Task Updates
  router.put("/admin/tasks/:id", validateRequest(insertTaskSchema.partial()), async (req, res) => {
    try {
      const { id } = req.params;
      const task = await storage.updateTask(parseInt(id, 10), req.body);
      
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      res.json(task);
    } catch (error) {
      console.error("Error updating admin task:", error);
      res.status(500).json({ message: "Error updating admin task" });
    }
  });
  
  // Admin Route for Task Deletion
  router.delete("/admin/tasks/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteTask(parseInt(id, 10));
      
      if (!success) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting task from admin:", error);
      res.status(500).json({ message: "Error deleting task" });
    }
  });
  
  // Admin Route for Boost Management
  router.get("/admin/boosts", async (req, res) => {
    try {
      const allBoosts = await storage.getBoostTypes();
      res.json(allBoosts);
    } catch (error) {
      console.error("Error fetching all boosts for admin:", error);
      res.status(500).json({ message: "Error fetching boosts" });
    }
  });

  // Admin Route for Boost Creation
  router.post("/admin/boosts", validateRequest(insertBoostTypeSchema), async (req, res) => {
    try {
      const boostType = await storage.createBoostType(req.body);
      res.status(201).json(boostType);
    } catch (error) {
      console.error("Error creating boost from admin:", error);
      res.status(500).json({ message: "Error creating boost" });
    }
  });
  
  // Admin Route for Boost Updates
  router.put("/admin/boosts/:id", validateRequest(insertBoostTypeSchema.partial()), async (req, res) => {
    try {
      const { id } = req.params;
      const boostType = await storage.updateBoostType(parseInt(id, 10), req.body);
      
      if (!boostType) {
        return res.status(404).json({ message: "Boost type not found" });
      }
      
      res.json(boostType);
    } catch (error) {
      console.error("Error updating boost from admin:", error);
      res.status(500).json({ message: "Error updating boost" });
    }
  });
  
  // Admin Route for Boost Deletion
  router.delete("/admin/boosts/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteBoostType(parseInt(id, 10));
      
      if (!success) {
        return res.status(404).json({ message: "Boost type not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting boost from admin:", error);
      res.status(500).json({ message: "Error deleting boost" });
    }
  });

  // Maintenance endpoint to deactivate expired boosts
  router.post("/maintenance/deactivate-expired-boosts", async (req, res) => {
    try {
      const count = await storage.deactivateExpiredBoosts();
      res.json({ message: `Deactivated ${count} expired boosts` });
    } catch (error) {
      console.error("Error deactivating expired boosts:", error);
      res.status(500).json({ message: "Error deactivating expired boosts" });
    }
  });
  
  // Health check
  router.get("/health", async (req, res) => {
    try {
      // Veritabanı bağlantısını test et
      const dbResult = await pool.query('SELECT NOW()');
      res.json({ 
        status: 'ok',
        time: new Date().toISOString(),
        database: {
          connected: true,
          time: dbResult.rows[0].now
        }
      });
    } catch (error) {
      console.error("Health check failed:", error);
      res.status(500).json({ 
        status: 'error',
        message: error.message,
        time: new Date().toISOString()
      });
    }
  });
  
  // İlerleme tabanlı görevler için endpointler
  router.post("/admin/tasks/progress", async (req, res) => {
    try {
      const tasks = await storage.createProgressTasks();
      res.status(201).json({ 
        message: "İlerleme tabanlı görevler başarıyla oluşturuldu", 
        count: tasks.length,
        tasks 
      });
    } catch (error) {
      console.error("Error creating progress tasks:", error);
      res.status(500).json({ message: "Error creating progress tasks" });
    }
  });

  // Görev ilerlemesini arttırma
  router.post("/users/:userId/tasks/:taskId/increment", async (req, res) => {
    try {
      const { userId, taskId } = req.params;
      const { amount = 1 } = req.body;
      
      const updatedTask = await storage.incrementTaskProgress(
        parseInt(userId, 10),
        parseInt(taskId, 10),
        amount
      );
      
      if (!updatedTask) {
        return res.status(404).json({ message: "Task or user not found" });
      }
      
      res.json(updatedTask);
    } catch (error) {
      console.error("Error incrementing task progress:", error);
      res.status(500).json({ message: "Error incrementing task progress" });
    }
  });

  // Haftalık görevleri sıfırlama
  router.post("/admin/tasks/reset-weekly", async (req, res) => {
    try {
      const resetCount = await storage.resetWeeklyTasks();
      res.json({ 
        message: "Haftalık görevler başarıyla sıfırlandı", 
        resetCount 
      });
    } catch (error) {
      console.error("Error resetting weekly tasks:", error);
      res.status(500).json({ message: "Error resetting weekly tasks" });
    }
  });
  
  // Mount the router
  app.use("/api", router);
  
  const httpServer = createServer(app);
  return httpServer;
}
