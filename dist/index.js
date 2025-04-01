// server/index.ts
import express2 from "express";

// server/routes.ts
import express from "express";
import { createServer } from "http";

// server/db.ts
import pkg from "pg";
import dotenv from "dotenv";
var { Pool } = pkg;
dotenv.config();
console.log("Veritaban\u0131 ba\u011Flant\u0131 bilgileri:");
console.log("Host:", process.env.DB_HOST);
console.log("Database:", process.env.DB_NAME);
console.log("Port:", process.env.DB_PORT);
console.log("User:", process.env.DB_USER);
console.log("URL:", process.env.DATABASE_URL);
var pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT || "5432"),
  max: 20,
  idleTimeoutMillis: 3e4,
  connectionTimeoutMillis: 5e3
});
pool.query("SELECT NOW()", (err, res) => {
  if (err) {
    console.error("Veritaban\u0131 ba\u011Flant\u0131 hatas\u0131:", err);
  } else {
    console.log("Veritaban\u0131 ba\u011Flant\u0131s\u0131 ba\u015Far\u0131l\u0131:", res.rows[0]);
  }
});
pool.on("error", (err) => {
  console.error("Veritaban\u0131 havuzu hatas\u0131:", err);
});
var db_default = pool;

// shared/schema.ts
import { pgTable, text, serial, integer, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  telegramId: text("telegram_id").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name"),
  username: text("username"),
  photoUrl: text("photo_url"),
  level: integer("level").notNull().default(1),
  points: integer("points").notNull().default(0),
  miningSpeed: integer("mining_speed").notNull().default(10),
  // points per hour
  lastMiningTime: timestamp("last_mining_time").notNull().default(sql`NOW()`),
  referralCode: text("referral_code").notNull().unique(),
  referredBy: text("referred_by"),
  joinDate: timestamp("join_date").notNull().default(sql`NOW()`),
  completedTasksCount: integer("completed_tasks_count").notNull().default(0),
  boostUsageCount: integer("boost_usage_count").notNull().default(0)
});
var insertUserSchema = createInsertSchema(users).omit({
  id: true,
  level: true,
  points: true,
  miningSpeed: true,
  lastMiningTime: true,
  completedTasksCount: true,
  boostUsageCount: true
});
var taskTypeEnum = pgEnum("task_type", ["daily", "weekly", "special"]);
var tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  type: taskTypeEnum("type").notNull(),
  points: integer("points").notNull(),
  requiredAmount: integer("required_amount").notNull().default(1),
  isActive: boolean("is_active").notNull().default(true),
  telegramAction: text("telegram_action"),
  // For tasks requiring Telegram interaction
  telegramTarget: text("telegram_target")
  // Target group, channel, etc.
});
var insertTaskSchema = createInsertSchema(tasks).omit({
  id: true
});
var userTasks = pgTable("user_tasks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  taskId: integer("task_id").notNull().references(() => tasks.id),
  progress: integer("progress").notNull().default(0),
  isCompleted: boolean("is_completed").notNull().default(false),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().default(sql`NOW()`)
});
var insertUserTaskSchema = createInsertSchema(userTasks).omit({
  id: true,
  completedAt: true,
  createdAt: true
});
var boostTypes = pgTable("boost_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  multiplier: integer("multiplier").notNull(),
  // Store as integer (e.g., 150 for 1.5x)
  durationHours: integer("duration_hours").notNull(),
  price: integer("price").notNull(),
  // Price in points
  isActive: boolean("is_active").notNull().default(true),
  iconName: text("icon_name").notNull().default("rocket"),
  colorClass: text("color_class").notNull().default("blue"),
  isPopular: boolean("is_popular").notNull().default(false)
});
var insertBoostTypeSchema = createInsertSchema(boostTypes).omit({
  id: true
});
var userBoosts = pgTable("user_boosts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  boostTypeId: integer("boost_type_id").notNull().references(() => boostTypes.id),
  startTime: timestamp("start_time").notNull().default(sql`NOW()`),
  endTime: timestamp("end_time").notNull(),
  isActive: boolean("is_active").notNull().default(true)
});
var insertUserBoostSchema = createInsertSchema(userBoosts).omit({
  id: true,
  startTime: true
});
var referrals = pgTable("referrals", {
  id: serial("id").primaryKey(),
  referrerId: integer("referrer_id").notNull().references(() => users.id),
  referredId: integer("referred_id").notNull().references(() => users.id),
  points: integer("points").notNull().default(100),
  createdAt: timestamp("created_at").notNull().default(sql`NOW()`)
});
var insertReferralSchema = createInsertSchema(referrals).omit({
  id: true,
  createdAt: true
});
function sql(strings) {
  return strings[0];
}

// server/routes.ts
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { nanoid } from "nanoid";
async function registerRoutes(app2) {
  const router = express.Router();
  const validateRequest = (schema) => (req, res, next) => {
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
  router.post("/users", async (req, res) => {
    try {
      if (req.body.telegramId === "123456789") {
        console.log("Creating test user with data:", JSON.stringify(req.body));
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
          lastMiningTime: /* @__PURE__ */ new Date(),
          joinDate: /* @__PURE__ */ new Date(),
          completedTasksCount: 0,
          boostUsageCount: 0
        };
        try {
          await db_default.query("DELETE FROM users WHERE telegram_id = $1", ["123456789"]);
        } catch (deleteError) {
          console.log("No existing test user to delete or error deleting:", deleteError);
        }
        const user2 = await storage.createUser(testUserData);
        console.log("Test user created in database:", JSON.stringify(user2));
        return res.status(201).json(user2);
      } else {
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
      const existingUser = await storage.getUserByTelegramId(telegramId);
      if (existingUser) {
        return res.json(existingUser);
      }
      const referralCode = req.body.referralCode || nanoid(8);
      const user = await storage.createUser({
        ...req.body,
        referralCode
      });
      if (req.body.referredBy) {
        const referrers = await storage.getUsersByReferralCode(req.body.referredBy);
        if (referrers.length > 0) {
          const referrer = referrers[0];
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
      const now = /* @__PURE__ */ new Date();
      const lastMining = new Date(user.lastMiningTime);
      const hoursDiff = Math.floor((now.getTime() - lastMining.getTime()) / (1e3 * 60 * 60));
      if (hoursDiff > 0) {
        let miningSpeed = user.miningSpeed;
        const activeBoosts = await storage.getUserActiveBoosts(user.id);
        for (const boost of activeBoosts) {
          miningSpeed = Math.floor(miningSpeed * (boost.boostType.multiplier / 100));
        }
        const earnedPoints = hoursDiff * miningSpeed;
        await storage.updateUserPoints(user.id, earnedPoints);
        await storage.updateUserLastMiningTime(user.id);
        const updatedUser = await storage.getUserById(user.id);
        if (updatedUser) {
          const referralCount2 = await storage.getReferralCount(user.id);
          return res.json({ ...updatedUser, referralCount: referralCount2 });
        }
      }
      const referralCount = await storage.getReferralCount(user.id);
      res.json({ ...user, referralCount });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Error fetching user" });
    }
  });
  router.get("/tasks", async (req, res) => {
    try {
      const { type } = req.query;
      const tasks2 = await storage.getTasks(type);
      res.json(tasks2);
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
  router.get("/users/:userId/tasks", async (req, res) => {
    try {
      const { userId } = req.params;
      const userTasks2 = await storage.getUserTasks(parseInt(userId, 10));
      res.json(userTasks2);
    } catch (error) {
      console.error("Error fetching user tasks:", error);
      res.status(500).json({ message: "Error fetching user tasks" });
    }
  });
  router.post("/users/:userId/tasks/:taskId/progress", async (req, res) => {
    try {
      const { userId, taskId } = req.params;
      const { progress } = req.body;
      let userTask = await storage.getUserTaskById(parseInt(userId, 10), parseInt(taskId, 10));
      if (!userTask) {
        userTask = await storage.createUserTask({
          userId: parseInt(userId, 10),
          taskId: parseInt(taskId, 10)
        });
      }
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
      let userTask = await storage.getUserTaskById(parseInt(userId, 10), parseInt(taskId, 10));
      if (!userTask) {
        userTask = await storage.createUserTask({
          userId: parseInt(userId, 10),
          taskId: parseInt(taskId, 10)
        });
      }
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
  router.get("/boosts", async (req, res) => {
    try {
      const boostTypes2 = await storage.getBoostTypes();
      res.json(boostTypes2);
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
  router.get("/users/:userId/boosts", async (req, res) => {
    try {
      const { userId } = req.params;
      const { active } = req.query;
      if (active === "true") {
        const activeBoosts = await storage.getUserActiveBoosts(parseInt(userId, 10));
        return res.json(activeBoosts);
      }
      const userBoosts2 = await storage.getUserBoosts(parseInt(userId, 10));
      res.json(userBoosts2);
    } catch (error) {
      console.error("Error fetching user boosts:", error);
      res.status(500).json({ message: "Error fetching user boosts" });
    }
  });
  router.post("/users/:userId/boosts", validateRequest(insertUserBoostSchema), async (req, res) => {
    try {
      const { userId } = req.params;
      const { boostTypeId } = req.body;
      const user = await storage.getUserById(parseInt(userId, 10));
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const boostType = await storage.getBoostTypeById(parseInt(boostTypeId, 10));
      if (!boostType) {
        return res.status(404).json({ message: "Boost type not found" });
      }
      if (user.points < boostType.price) {
        return res.status(400).json({ message: "Insufficient points" });
      }
      await storage.updateUserPoints(user.id, -boostType.price);
      const endTime = /* @__PURE__ */ new Date();
      endTime.setHours(endTime.getHours() + boostType.durationHours);
      const userBoost = await storage.createUserBoost({
        userId: parseInt(userId, 10),
        boostTypeId: parseInt(boostTypeId, 10),
        endTime
      });
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
  router.get("/users/:userId/referrals", async (req, res) => {
    try {
      const { userId } = req.params;
      const referrals2 = await storage.getReferrals(parseInt(userId, 10));
      res.json(referrals2);
    } catch (error) {
      console.error("Error fetching referrals:", error);
      res.status(500).json({ message: "Error fetching referrals" });
    }
  });
  router.get("/admin/tasks", async (req, res) => {
    try {
      const tasks2 = await storage.getTasks();
      res.json(tasks2);
    } catch (error) {
      console.error("Error fetching admin tasks:", error);
      res.status(500).json({ message: "Error fetching admin tasks" });
    }
  });
  router.post("/admin/tasks", validateRequest(insertTaskSchema), async (req, res) => {
    try {
      const task = await storage.createTask(req.body);
      res.status(201).json(task);
    } catch (error) {
      console.error("Error creating admin task:", error);
      res.status(500).json({ message: "Error creating admin task" });
    }
  });
  router.post("/admin/tasks/telegram", async (req, res) => {
    try {
      const tasks2 = await storage.createTelegramTasks();
      res.status(201).json({
        message: "Telegram g\xF6revleri ba\u015Far\u0131yla olu\u015Fturuldu",
        count: tasks2.length,
        tasks: tasks2
      });
    } catch (error) {
      console.error("Error creating Telegram tasks:", error);
      res.status(500).json({ message: "Error creating Telegram tasks" });
    }
  });
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
  router.get("/admin/boosts", async (req, res) => {
    try {
      const allBoosts = await storage.getBoostTypes();
      res.json(allBoosts);
    } catch (error) {
      console.error("Error fetching all boosts for admin:", error);
      res.status(500).json({ message: "Error fetching boosts" });
    }
  });
  router.post("/admin/boosts", validateRequest(insertBoostTypeSchema), async (req, res) => {
    try {
      const boostType = await storage.createBoostType(req.body);
      res.status(201).json(boostType);
    } catch (error) {
      console.error("Error creating boost from admin:", error);
      res.status(500).json({ message: "Error creating boost" });
    }
  });
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
  router.post("/maintenance/deactivate-expired-boosts", async (req, res) => {
    try {
      const count = await storage.deactivateExpiredBoosts();
      res.json({ message: `Deactivated ${count} expired boosts` });
    } catch (error) {
      console.error("Error deactivating expired boosts:", error);
      res.status(500).json({ message: "Error deactivating expired boosts" });
    }
  });
  router.get("/health", async (req, res) => {
    try {
      const dbResult = await db_default.query("SELECT NOW()");
      res.json({
        status: "ok",
        time: (/* @__PURE__ */ new Date()).toISOString(),
        database: {
          connected: true,
          time: dbResult.rows[0].now
        }
      });
    } catch (error) {
      console.error("Health check failed:", error);
      res.status(500).json({
        status: "error",
        message: error.message,
        time: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
  });
  router.post("/admin/tasks/progress", async (req, res) => {
    try {
      const tasks2 = await storage.createProgressTasks();
      res.status(201).json({
        message: "\u0130lerleme tabanl\u0131 g\xF6revler ba\u015Far\u0131yla olu\u015Fturuldu",
        count: tasks2.length,
        tasks: tasks2
      });
    } catch (error) {
      console.error("Error creating progress tasks:", error);
      res.status(500).json({ message: "Error creating progress tasks" });
    }
  });
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
  router.post("/admin/tasks/reset-weekly", async (req, res) => {
    try {
      const resetCount = await storage.resetWeeklyTasks();
      res.json({
        message: "Haftal\u0131k g\xF6revler ba\u015Far\u0131yla s\u0131f\u0131rland\u0131",
        resetCount
      });
    } catch (error) {
      console.error("Error resetting weekly tasks:", error);
      res.status(500).json({ message: "Error resetting weekly tasks" });
    }
  });
  app2.use("/api", router);
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import fs from "fs";
import path2, { dirname as dirname2 } from "path";
import { fileURLToPath as fileURLToPath2 } from "url";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import path, { dirname } from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { fileURLToPath } from "url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = dirname(__filename);
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    themePlugin(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets")
    }
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true
  }
});

// server/vite.ts
import { nanoid as nanoid2 } from "nanoid";
var __filename2 = fileURLToPath2(import.meta.url);
var __dirname2 = dirname2(__filename2);
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  try {
    const serverOptions = {
      middlewareMode: true,
      hmr: { server },
      allowedHosts: true
    };
    const vite = await createViteServer({
      ...vite_config_default,
      configFile: false,
      customLogger: {
        ...viteLogger,
        error: (msg, options) => {
          viteLogger.error(msg, options);
          console.error("Vite Error:", msg);
        }
      },
      server: serverOptions,
      appType: "custom"
    });
    app2.use(vite.middlewares);
    app2.use("*", async (req, res, next) => {
      const url = req.originalUrl;
      try {
        const clientTemplate = path2.resolve(
          __dirname2,
          "..",
          "client",
          "index.html"
        );
        let template = await fs.promises.readFile(clientTemplate, "utf-8");
        template = template.replace(
          `src="/src/main.tsx"`,
          `src="/src/main.tsx?v=${nanoid2()}"`
        );
        const page = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(page);
      } catch (e) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } catch (e) {
    console.error("Error setting up Vite:", e);
    throw e;
  }
}
function serveStatic(app2) {
  const publicPath = path2.resolve(__dirname2, "..", "client", "public");
  if (!fs.existsSync(publicPath)) {
    console.log("Public directory not found. Creating...");
    fs.mkdirSync(publicPath, { recursive: true });
  }
  return (req, res) => {
    res.sendFile(path2.resolve(publicPath, "index.html"));
  };
}

// server/postgres.ts
var PostgresStorage = class {
  // User methods
  async getUserByTelegramId(telegramId) {
    try {
      const result = await db_default.query(
        "SELECT * FROM users WHERE telegram_id = $1",
        [telegramId]
      );
      return result.rows[0] || void 0;
    } catch (error) {
      console.error("Error getting user by telegram ID:", error);
      return void 0;
    }
  }
  async createUser(userData) {
    try {
      const defaultValues = {
        level: 1,
        points: 0,
        miningSpeed: 10,
        lastMiningTime: /* @__PURE__ */ new Date(),
        completedTasksCount: 0,
        boostUsageCount: 0,
        joinDate: /* @__PURE__ */ new Date()
      };
      const result = await db_default.query(
        `INSERT INTO users (
          telegram_id, username, first_name, last_name, photo_url, referral_code, referred_by, 
          level, points, mining_speed, last_mining_time, completed_tasks_count, 
          boost_usage_count, join_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
        [
          userData.telegramId,
          userData.username,
          userData.firstName,
          userData.lastName,
          userData.photoUrl,
          userData.referralCode,
          userData.referredBy,
          defaultValues.level,
          defaultValues.points,
          defaultValues.miningSpeed,
          defaultValues.lastMiningTime,
          defaultValues.completedTasksCount,
          defaultValues.boostUsageCount,
          userData.joinDate || defaultValues.joinDate
        ]
      );
      return result.rows[0];
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  }
  async updateUserPoints(userId, points) {
    try {
      console.log(`Updating points for user ${userId}: +${points} points`);
      const userResult = await db_default.query(
        "SELECT points FROM users WHERE id = $1",
        [userId]
      );
      if (userResult.rows.length === 0) {
        console.error(`User not found with ID: ${userId}`);
        return void 0;
      }
      const currentPoints = userResult.rows[0].points || 0;
      console.log(`Current points: ${currentPoints}, new total: ${currentPoints + points}`);
      const newPoints = currentPoints + points;
      const result = await db_default.query(
        "UPDATE users SET points = $1 WHERE id = $2 RETURNING *",
        [newPoints, userId]
      );
      console.log(`User points updated successfully:`, result.rows[0]);
      return result.rows[0];
    } catch (error) {
      console.error("Error updating user points:", error);
      return void 0;
    }
  }
  async getUserById(id) {
    try {
      const result = await db_default.query(
        "SELECT * FROM users WHERE id = $1",
        [id]
      );
      return result.rows[0] || void 0;
    } catch (error) {
      console.error("Error getting user by ID:", error);
      return void 0;
    }
  }
  async updateUserMiningSpeed(userId, speed) {
    try {
      const result = await db_default.query(
        "UPDATE users SET mining_speed = $1 WHERE id = $2 RETURNING *",
        [speed, userId]
      );
      return result.rows[0] || void 0;
    } catch (error) {
      console.error("Error updating user mining speed:", error);
      return void 0;
    }
  }
  async updateUserLastMiningTime(userId) {
    try {
      const result = await db_default.query(
        "UPDATE users SET last_mining_time = $1 WHERE id = $2 RETURNING *",
        [/* @__PURE__ */ new Date(), userId]
      );
      return result.rows[0] || void 0;
    } catch (error) {
      console.error("Error updating user last mining time:", error);
      return void 0;
    }
  }
  async getUsersByReferralCode(referralCode) {
    try {
      const result = await db_default.query(
        "SELECT * FROM users WHERE referral_code = $1",
        [referralCode]
      );
      return result.rows;
    } catch (error) {
      console.error("Error getting users by referral code:", error);
      return [];
    }
  }
  // Task methods
  async getTasks(type) {
    try {
      let query = "SELECT * FROM tasks WHERE is_active = true";
      const params = [];
      if (type) {
        query += " AND type = $1";
        params.push(type);
      }
      const result = await db_default.query(query, params);
      return result.rows;
    } catch (error) {
      console.error("Error getting tasks:", error);
      return [];
    }
  }
  async getTaskById(id) {
    try {
      const result = await db_default.query(
        "SELECT * FROM tasks WHERE id = $1",
        [id]
      );
      return result.rows[0] || void 0;
    } catch (error) {
      console.error("Error getting task by ID:", error);
      return void 0;
    }
  }
  async createTask(taskData) {
    try {
      const taskType = taskData.type || "daily";
      let defaultPoints = 50;
      let defaultRequiredAmount = 1;
      switch (taskType) {
        case "social":
          defaultPoints = 100;
          defaultRequiredAmount = 1;
          break;
        case "weekly":
          defaultPoints = 200;
          defaultRequiredAmount = 5;
          break;
        case "referral":
          defaultPoints = 300;
          defaultRequiredAmount = 1;
          break;
        case "milestone":
          defaultPoints = 500;
          defaultRequiredAmount = 1;
          break;
        case "special":
          defaultPoints = 1e3;
          defaultRequiredAmount = 1;
          break;
        case "daily":
        default:
          defaultPoints = 50;
          defaultRequiredAmount = 1;
          break;
      }
      const result = await db_default.query(
        `INSERT INTO tasks (
          title, description, type, points, required_amount, 
          is_active, telegram_action, telegram_target
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [
          taskData.title,
          taskData.description,
          taskType,
          taskData.points || defaultPoints,
          taskData.requiredAmount || defaultRequiredAmount,
          taskData.isActive !== void 0 ? taskData.isActive : true,
          taskData.telegramAction,
          taskData.telegramTarget
        ]
      );
      return result.rows[0];
    } catch (error) {
      console.error("Error creating task:", error);
      throw error;
    }
  }
  async updateTask(id, taskData) {
    try {
      const fields = Object.keys(taskData).map((key, i) => `${key} = $${i + 1}`).join(", ");
      const values = Object.values(taskData);
      values.push(id);
      const result = await db_default.query(
        `UPDATE tasks SET ${fields} WHERE id = $${values.length} RETURNING *`,
        values
      );
      return result.rows[0] || void 0;
    } catch (error) {
      console.error("Error updating task:", error);
      return void 0;
    }
  }
  async deleteTask(id) {
    try {
      const result = await db_default.query(
        "DELETE FROM tasks WHERE id = $1 RETURNING id",
        [id]
      );
      return result.rowCount ? result.rowCount > 0 : false;
    } catch (error) {
      console.error("Error deleting task:", error);
      return false;
    }
  }
  // UserTask methods
  async getUserTasks(userId) {
    try {
      const result = await db_default.query(
        `SELECT ut.*, t.* FROM user_tasks ut
         JOIN tasks t ON ut.task_id = t.id
         WHERE ut.user_id = $1`,
        [userId]
      );
      return result.rows.map((row) => {
        const userTask = {
          id: row.id,
          userId: row.user_id,
          taskId: row.task_id,
          progress: row.progress,
          isCompleted: row.is_completed,
          completedAt: row.completed_at,
          createdAt: row.created_at
        };
        const task = {
          id: row.task_id,
          title: row.title,
          description: row.description,
          type: row.type,
          points: row.points,
          requiredAmount: row.required_amount,
          isActive: row.is_active,
          telegramAction: row.telegram_action,
          telegramTarget: row.telegram_target
        };
        return { ...userTask, task };
      });
    } catch (error) {
      console.error("Error getting user tasks:", error);
      return [];
    }
  }
  async getUserTaskById(userId, taskId) {
    try {
      const result = await db_default.query(
        "SELECT * FROM user_tasks WHERE user_id = $1 AND task_id = $2",
        [userId, taskId]
      );
      return result.rows[0] || void 0;
    } catch (error) {
      console.error("Error getting user task by ID:", error);
      return void 0;
    }
  }
  async createUserTask(userTaskData) {
    try {
      const result = await db_default.query(
        `INSERT INTO user_tasks (
          user_id, task_id, progress, is_completed, completed_at, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [
          userTaskData.userId,
          userTaskData.taskId,
          userTaskData.progress || 0,
          userTaskData.isCompleted || false,
          userTaskData.completedAt || null,
          userTaskData.createdAt || /* @__PURE__ */ new Date()
        ]
      );
      return result.rows[0];
    } catch (error) {
      console.error("Error creating user task:", error);
      throw error;
    }
  }
  async updateUserTaskProgress(userId, taskId, progress) {
    try {
      console.log(`Updating task progress for user ${userId}, task ${taskId}, progress: ${progress}`);
      const taskResult = await db_default.query(
        "SELECT required_amount FROM tasks WHERE id = $1",
        [taskId]
      );
      if (taskResult.rows.length === 0) {
        console.error(`Task not found with ID: ${taskId}`);
        throw new Error("Task not found");
      }
      const requiredAmount = taskResult.rows[0].required_amount;
      console.log(`Task requiredAmount: ${requiredAmount}`);
      const userTaskResult = await db_default.query(
        "SELECT progress, is_completed FROM user_tasks WHERE user_id = $1 AND task_id = $2",
        [userId, taskId]
      );
      let userTask;
      if (userTaskResult.rows.length === 0) {
        console.log(`No existing user task, creating new one`);
        userTask = await this.createUserTask({
          userId,
          taskId,
          progress: Math.min(progress, requiredAmount)
        });
      } else {
        userTask = userTaskResult.rows[0];
        console.log(`Existing user task found with progress: ${userTask.progress}, completed: ${userTask.is_completed}`);
      }
      if (userTask.is_completed) {
        console.log(`Task already completed, no update needed`);
        return userTask;
      }
      const newProgress = Math.min(progress, requiredAmount);
      const isCompleted = newProgress >= requiredAmount;
      console.log(`New progress: ${newProgress}, isCompleted: ${isCompleted}`);
      const updateResult = await db_default.query(
        `UPDATE user_tasks SET 
          progress = $1, 
          is_completed = $2,
          completed_at = $3
         WHERE user_id = $4 AND task_id = $5 RETURNING *`,
        [
          newProgress,
          isCompleted,
          isCompleted ? /* @__PURE__ */ new Date() : null,
          userId,
          taskId
        ]
      );
      const updatedTask = updateResult.rows[0];
      console.log(`Task progress updated successfully:`, updatedTask);
      return updatedTask;
    } catch (error) {
      console.error("Error updating user task progress:", error);
      throw error;
    }
  }
  async completeTask(userId, taskId, userTelegramId) {
    try {
      console.log(`Completing task for user ${userId}, task ${taskId}`);
      const taskResult = await db_default.query(
        "SELECT * FROM tasks WHERE id = $1",
        [taskId]
      );
      const task = taskResult.rows[0];
      if (!task) {
        console.error(`Task not found with ID: ${taskId}`);
        return null;
      }
      console.log(`Task found:`, task);
      const userTaskResult = await db_default.query(
        "SELECT * FROM user_tasks WHERE user_id = $1 AND task_id = $2",
        [userId, taskId]
      );
      console.log(`User task found:`, userTaskResult.rows[0] || "No existing user task");
      let userTask;
      const userTaskExists = userTaskResult.rows.length > 0;
      if (userTaskExists) {
        const existingUserTask = userTaskResult.rows[0];
        if (existingUserTask.is_completed) {
          console.log(`Task already completed for user ${userId}`);
          return existingUserTask;
        }
        const updateResult = await db_default.query(
          `UPDATE user_tasks SET 
            progress = $1, 
            is_completed = true,
            completed_at = $2
            WHERE user_id = $3 AND task_id = $4 RETURNING *`,
          [
            task.required_amount,
            /* @__PURE__ */ new Date(),
            userId,
            taskId
          ]
        );
        userTask = updateResult.rows[0];
        console.log(`Updated user task:`, userTask);
      } else {
        console.log(`Creating new user task for user ${userId} and task ${taskId}`);
        userTask = await this.createUserTask({
          userId,
          taskId,
          progress: task.required_amount,
          isCompleted: true,
          completedAt: /* @__PURE__ */ new Date()
        });
        console.log(`Created new user task:`, userTask);
      }
      console.log(`Awarding ${task.points} points to user ${userId}`);
      const updatedUser = await this.updateUserPoints(userId, task.points);
      console.log(`User points updated:`, updatedUser?.points || "Failed to update user points");
      console.log(`Incrementing completed tasks count for user ${userId}`);
      await db_default.query(
        "UPDATE users SET completed_tasks_count = completed_tasks_count + 1 WHERE id = $1",
        [userId]
      );
      return userTask;
    } catch (error) {
      console.error("Error completing task:", error);
      return null;
    }
  }
  async completeUserTask(userId, taskId) {
    try {
      const result = await this.completeTask(userId, taskId, "");
      return result || void 0;
    } catch (error) {
      console.error("Error in completeUserTask:", error);
      return void 0;
    }
  }
  // BoostType methods
  async getBoostTypes() {
    try {
      const result = await db_default.query("SELECT * FROM boost_types WHERE is_active = true");
      return result.rows;
    } catch (error) {
      console.error("Error getting boost types:", error);
      return [];
    }
  }
  async getBoostTypeById(id) {
    try {
      const result = await db_default.query(
        "SELECT * FROM boost_types WHERE id = $1",
        [id]
      );
      return result.rows[0] || void 0;
    } catch (error) {
      console.error("Error getting boost type by ID:", error);
      return void 0;
    }
  }
  async createBoostType(boostTypeData) {
    try {
      const result = await db_default.query(
        `INSERT INTO boost_types (
          name, description, multiplier, duration_hours, 
          price, is_active, icon_name, color_class, is_popular
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [
          boostTypeData.name,
          boostTypeData.description,
          boostTypeData.multiplier,
          boostTypeData.durationHours,
          boostTypeData.price,
          boostTypeData.isActive !== void 0 ? boostTypeData.isActive : true,
          boostTypeData.iconName,
          boostTypeData.colorClass,
          boostTypeData.isPopular || false
        ]
      );
      return result.rows[0];
    } catch (error) {
      console.error("Error creating boost type:", error);
      throw error;
    }
  }
  async updateBoostType(id, boostTypeData) {
    try {
      const snakeCaseData = {};
      for (const [key, value] of Object.entries(boostTypeData)) {
        const snakeKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
        snakeCaseData[snakeKey] = value;
      }
      const fields = Object.keys(snakeCaseData).map((key, i) => `${key} = $${i + 1}`).join(", ");
      const values = Object.values(snakeCaseData);
      values.push(id);
      const result = await db_default.query(
        `UPDATE boost_types SET ${fields} WHERE id = $${values.length} RETURNING *`,
        values
      );
      return result.rows[0] || void 0;
    } catch (error) {
      console.error("Error updating boost type:", error);
      return void 0;
    }
  }
  async deleteBoostType(id) {
    try {
      const result = await db_default.query(
        "DELETE FROM boost_types WHERE id = $1 RETURNING id",
        [id]
      );
      return result.rowCount ? result.rowCount > 0 : false;
    } catch (error) {
      console.error("Error deleting boost type:", error);
      return false;
    }
  }
  // UserBoost methods
  async getUserBoosts(userId) {
    try {
      const result = await db_default.query(
        `SELECT ub.*, bt.* FROM user_boosts ub
         JOIN boost_types bt ON ub.boost_type_id = bt.id
         WHERE ub.user_id = $1 AND ub.is_active = true`,
        [userId]
      );
      return result.rows.map((row) => {
        const userBoost = {
          id: row.id,
          userId: row.user_id,
          boostTypeId: row.boost_type_id,
          endTime: row.end_time,
          isActive: row.is_active,
          createdAt: row.created_at,
          boostType: {
            id: row.id,
            name: row.name,
            description: row.description,
            multiplier: row.multiplier,
            durationHours: row.duration_hours,
            price: row.price,
            isActive: row.is_active,
            iconName: row.icon_name,
            colorClass: row.color_class,
            isPopular: row.is_popular,
            createdAt: row.created_at,
            updatedAt: row.updated_at
          }
        };
        return userBoost;
      });
    } catch (error) {
      console.error("Error getting user boosts:", error);
      return [];
    }
  }
  async getUserActiveBoosts(userId) {
    try {
      const result = await db_default.query(
        `SELECT ub.*, bt.* FROM user_boosts ub
         JOIN boost_types bt ON ub.boost_type_id = bt.id
         WHERE ub.user_id = $1 AND ub.is_active = true AND ub.end_time > NOW()`,
        [userId]
      );
      return result.rows.map((row) => {
        const userBoost = {
          id: row.id,
          userId: row.user_id,
          boostTypeId: row.boost_type_id,
          isActive: row.is_active,
          startTime: row.start_time,
          endTime: row.end_time
        };
        const boostType = {
          id: row.boost_type_id,
          name: row.name,
          description: row.description,
          multiplier: row.multiplier,
          durationHours: row.duration_hours,
          price: row.price,
          isActive: row.is_active,
          iconName: row.icon_name,
          colorClass: row.color_class,
          isPopular: row.is_popular
        };
        return { ...userBoost, boostType };
      });
    } catch (error) {
      console.error("Error getting user active boosts:", error);
      return [];
    }
  }
  async createUserBoost(userBoostData) {
    try {
      const boostTypeResult = await db_default.query(
        "SELECT duration_hours FROM boost_types WHERE id = $1",
        [userBoostData.boostTypeId]
      );
      if (boostTypeResult.rows.length === 0) {
        throw new Error("Boost type not found");
      }
      const durationHours = boostTypeResult.rows[0].duration_hours;
      const startTime = userBoostData.startTime || /* @__PURE__ */ new Date();
      const endTime = new Date(startTime);
      endTime.setHours(endTime.getHours() + durationHours);
      const result = await db_default.query(
        `INSERT INTO user_boosts (
          user_id, boost_type_id, is_active, start_time, end_time
        ) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [
          userBoostData.userId,
          userBoostData.boostTypeId,
          userBoostData.isActive !== void 0 ? userBoostData.isActive : true,
          startTime,
          endTime
        ]
      );
      await db_default.query(
        "UPDATE users SET boost_usage_count = boost_usage_count + 1 WHERE id = $1",
        [userBoostData.userId]
      );
      return result.rows[0];
    } catch (error) {
      console.error("Error creating user boost:", error);
      throw error;
    }
  }
  async deactivateExpiredBoosts() {
    try {
      const result = await db_default.query(
        `UPDATE user_boosts 
         SET is_active = false 
         WHERE is_active = true AND end_time < NOW() 
         RETURNING id`
      );
      return result.rowCount || 0;
    } catch (error) {
      console.error("Error deactivating expired boosts:", error);
      return 0;
    }
  }
  // Referral methods
  async getReferrals(referrerId) {
    try {
      const result = await db_default.query(
        `SELECT r.*, u.* FROM referrals r
         JOIN users u ON r.referred_id = u.id
         WHERE r.referrer_id = $1`,
        [referrerId]
      );
      return result.rows.map((row) => {
        const referral = {
          id: row.id,
          referrerId: row.referrer_id,
          referredId: row.referred_id,
          points: row.points || 0,
          createdAt: row.created_at
        };
        const referred = {
          id: row.referred_id,
          telegramId: row.telegram_id,
          username: row.username,
          firstName: row.first_name,
          lastName: row.last_name,
          photoUrl: row.photo_url,
          referralCode: row.referral_code,
          referredBy: row.referred_by,
          level: row.level,
          points: row.points,
          miningSpeed: row.mining_speed,
          lastMiningTime: row.last_mining_time,
          completedTasksCount: row.completed_tasks_count,
          boostUsageCount: row.boost_usage_count,
          joinDate: row.join_date
        };
        return { ...referral, referred };
      });
    } catch (error) {
      console.error("Error getting referrals:", error);
      return [];
    }
  }
  async createReferral(referralData) {
    try {
      const result = await db_default.query(
        `INSERT INTO referrals (
          referrer_id, referred_id, points, created_at
        ) VALUES ($1, $2, $3, $4) RETURNING *`,
        [
          referralData.referrerId,
          referralData.referredId,
          referralData.points || 0,
          referralData.createdAt || /* @__PURE__ */ new Date()
        ]
      );
      return result.rows[0];
    } catch (error) {
      console.error("Error creating referral:", error);
      throw error;
    }
  }
  async getReferralCount(userId) {
    try {
      const result = await db_default.query(
        "SELECT COUNT(*) as count FROM referrals WHERE referrer_id = $1",
        [userId]
      );
      return parseInt(result.rows[0].count);
    } catch (error) {
      console.error("Error getting referral count:", error);
      return 0;
    }
  }
  // Telegram görevleri oluşturmak için yardımcı fonksiyon
  async createTelegramTasks() {
    try {
      const tasks2 = [];
      const channelTask = await this.createTask({
        title: "Telegram Kanal\u0131na Kat\u0131l",
        description: "Resmi Telegram kanal\u0131m\u0131za kat\u0131larak g\xFCncellemelerden ve duyurulardan haberdar ol.",
        type: "social",
        points: 150,
        requiredAmount: 1,
        isActive: true,
        telegramAction: "join_channel",
        telegramTarget: "https://t.me/taskboostofficial"
        // Gerçek kanal linkinizi buraya ekleyin
      });
      tasks2.push(channelTask);
      const groupTask = await this.createTask({
        title: "Telegram Grubuna Kat\u0131l",
        description: "Toplulu\u011Fumuzla etkile\u015Fime ge\xE7mek i\xE7in resmi Telegram grubumuza kat\u0131l.",
        type: "social",
        points: 100,
        requiredAmount: 1,
        isActive: true,
        telegramAction: "join_channel",
        telegramTarget: "https://t.me/taskboostcommunity"
        // Gerçek grup linkinizi buraya ekleyin
      });
      tasks2.push(groupTask);
      const referralTask = await this.createTask({
        title: "Arkada\u015Flar\u0131n\u0131 Davet Et",
        description: "Referans kodunu kullanarak 3 arkada\u015F\u0131n\u0131 davet et ve \xF6d\xFCl kazan.",
        type: "referral",
        points: 300,
        requiredAmount: 3,
        isActive: true,
        telegramAction: "invite_friends",
        telegramTarget: null
      });
      tasks2.push(referralTask);
      const botMessageTask = await this.createTask({
        title: "Bota Mesaj G\xF6nder",
        description: "TaskBoost botuna /start komutu g\xF6ndererek g\xF6revi tamamla.",
        type: "daily",
        points: 50,
        requiredAmount: 1,
        isActive: true,
        telegramAction: "send_message",
        telegramTarget: "https://t.me/taskboost_bot"
        // Gerçek bot linkinizi buraya ekleyin
      });
      tasks2.push(botMessageTask);
      return tasks2;
    } catch (error) {
      console.error("Error creating Telegram tasks:", error);
      return [];
    }
  }
  // İlerleme tabanlı görevler için yardımcı fonksiyonlar
  async createProgressTasks() {
    try {
      const tasks2 = [];
      const dailyLoginTask = await this.createTask({
        title: "G\xFCnl\xFCk Giri\u015F",
        description: "Uygulamaya her g\xFCn giri\u015F yaparak puan kazan\u0131n.",
        type: "daily",
        points: 50,
        requiredAmount: 1,
        isActive: true,
        telegramAction: "open_app",
        telegramTarget: null
      });
      tasks2.push(dailyLoginTask);
      const miningTask = await this.createTask({
        title: "Madencilik Yap",
        description: "Uygulamay\u0131 kullanarak madencilik yap\u0131n ve puan kazan\u0131n.",
        type: "daily",
        points: 100,
        requiredAmount: 5,
        isActive: true,
        telegramAction: null,
        telegramTarget: null
      });
      tasks2.push(miningTask);
      const weeklyProgressTask = await this.createTask({
        title: "Haftal\u0131k Hedef",
        description: "Bu hafta 500 puan toplay\u0131n.",
        type: "weekly",
        points: 200,
        requiredAmount: 500,
        isActive: true,
        telegramAction: null,
        telegramTarget: null
      });
      tasks2.push(weeklyProgressTask);
      const profileTask = await this.createTask({
        title: "Profil Bilgilerini Tamamla",
        description: "Profil bilgilerinizi eksiksiz doldurun.",
        type: "milestone",
        points: 300,
        requiredAmount: 100,
        isActive: true,
        telegramAction: null,
        telegramTarget: null
      });
      tasks2.push(profileTask);
      const referralTask = await this.createTask({
        title: "Arkada\u015Flar\u0131n\u0131 Davet Et",
        description: "5 arkada\u015F\u0131n\u0131 davet et ve ekstra puan kazan.",
        type: "referral",
        points: 500,
        requiredAmount: 5,
        isActive: true,
        telegramAction: "invite_friends",
        telegramTarget: null
      });
      tasks2.push(referralTask);
      return tasks2;
    } catch (error) {
      console.error("Error creating progress tasks:", error);
      return [];
    }
  }
  // Kullanıcı görev ilerlemesini güncelleme metodu
  async incrementTaskProgress(userId, taskId, incrementAmount = 1) {
    try {
      console.log(`Incrementing task progress for user ${userId}, task ${taskId}, amount ${incrementAmount}`);
      const taskResult = await db_default.query(
        "SELECT * FROM tasks WHERE id = $1",
        [taskId]
      );
      const task = taskResult.rows[0];
      if (!task) {
        console.error(`Task not found with ID: ${taskId}`);
        return null;
      }
      console.log(`Task found:`, task);
      const userTaskResult = await db_default.query(
        "SELECT * FROM user_tasks WHERE user_id = $1 AND task_id = $2",
        [userId, taskId]
      );
      console.log(`User task found:`, userTaskResult.rows[0] || "No existing user task");
      let userTask;
      if (userTaskResult.rows.length > 0) {
        const existingUserTask = userTaskResult.rows[0];
        if (existingUserTask.is_completed) {
          console.log(`Task is already completed for user ${userId}`);
          return existingUserTask;
        }
        const newProgress = Math.min(existingUserTask.progress + incrementAmount, task.required_amount);
        const isCompleted = newProgress >= task.required_amount;
        console.log(`Updating progress from ${existingUserTask.progress} to ${newProgress}, completed: ${isCompleted}`);
        const updateResult = await db_default.query(
          `UPDATE user_tasks SET
            progress = $1,
            is_completed = $2,
            completed_at = $3
           WHERE user_id = $4 AND task_id = $5 RETURNING *`,
          [
            newProgress,
            isCompleted,
            isCompleted ? /* @__PURE__ */ new Date() : null,
            userId,
            taskId
          ]
        );
        userTask = updateResult.rows[0];
        console.log(`Updated user task:`, userTask);
        if (isCompleted) {
          console.log(`Task completed. Awarding ${task.points} points to user ${userId}`);
          const updatedUser = await this.updateUserPoints(userId, task.points);
          console.log(`User points updated:`, updatedUser?.points || "Failed to update user points");
          await db_default.query(
            "UPDATE users SET completed_tasks_count = completed_tasks_count + 1 WHERE id = $1",
            [userId]
          );
        }
      } else {
        console.log(`Creating new user task for user ${userId} and task ${taskId}`);
        const isInitiallyCompleted = incrementAmount >= task.required_amount;
        userTask = await this.createUserTask({
          userId,
          taskId,
          progress: Math.min(incrementAmount, task.required_amount),
          isCompleted: isInitiallyCompleted,
          completedAt: isInitiallyCompleted ? /* @__PURE__ */ new Date() : null
        });
        console.log(`Created new user task:`, userTask);
        if (isInitiallyCompleted) {
          console.log(`Task completed immediately. Awarding ${task.points} points to user ${userId}`);
          const updatedUser = await this.updateUserPoints(userId, task.points);
          console.log(`User points updated:`, updatedUser?.points || "Failed to update user points");
          await db_default.query(
            "UPDATE users SET completed_tasks_count = completed_tasks_count + 1 WHERE id = $1",
            [userId]
          );
        }
      }
      return userTask;
    } catch (error) {
      console.error("Error incrementing task progress:", error);
      return null;
    }
  }
  // Haftalık görevleri sıfırlama fonksiyonu
  async resetWeeklyTasks() {
    try {
      const weeklyTasksResult = await db_default.query(
        "SELECT id FROM tasks WHERE type = 'weekly' AND is_active = true"
      );
      if (weeklyTasksResult.rows.length === 0) return 0;
      const weeklyTaskIds = weeklyTasksResult.rows.map((row) => row.id);
      const resetResult = await db_default.query(
        `UPDATE user_tasks SET 
          progress = 0, 
          is_completed = false,
          completed_at = NULL
         WHERE task_id = ANY($1) RETURNING id`,
        [weeklyTaskIds]
      );
      return resetResult.rowCount || 0;
    } catch (error) {
      console.error("Error resetting weekly tasks:", error);
      return 0;
    }
  }
};

// server/index.ts
var storage = new PostgresStorage();
var app = express2();
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  next();
});
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.get("/api/test", (req, res) => {
  res.json({
    status: "OK",
    message: "API \xE7al\u0131\u015F\u0131yor!",
    time: (/* @__PURE__ */ new Date()).toISOString()
  });
});
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  try {
    const server = await registerRoutes(app);
    app.use((err, _req, res, _next) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ message });
    });
    if (process.env.NODE_ENV === "development") {
      await setupVite(app, server);
    } else {
      const path3 = await import("path");
      const { dirname: dirname3 } = path3;
      const { fileURLToPath: fileURLToPath3 } = await import("url");
      const __filename3 = fileURLToPath3(import.meta.url);
      const __dirname3 = dirname3(__filename3);
      const distPath = path3.resolve(__dirname3, "../dist/public");
      app.use(express2.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path3.resolve(distPath, "index.html"));
      });
    }
    if (process.env.NODE_ENV === "development") {
      app.use(serveStatic);
    }
    const PORT = process.env.SERVER_PORT || process.env.PORT || 3001;
    server.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
    return server;
  } catch (error) {
    console.error("Server startup error:", error);
    process.exit(1);
  }
})();
export {
  storage
};
