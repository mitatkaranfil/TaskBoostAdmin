import {
  users, User, InsertUser,
  tasks, Task, InsertTask,
  userTasks, UserTask, InsertUserTask,
  boostTypes, BoostType, InsertBoostType,
  userBoosts, UserBoost, InsertUserBoost,
  referrals, Referral, InsertReferral
} from "@shared/schema";

// Define the storage interface
export interface IStorage {
  // User methods
  getUserByTelegramId(telegramId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserPoints(userId: number, points: number): Promise<User | undefined>;
  getUserById(id: number): Promise<User | undefined>;
  updateUserMiningSpeed(userId: number, speed: number): Promise<User | undefined>;
  updateUserLastMiningTime(userId: number): Promise<User | undefined>;
  getUsersByReferralCode(referralCode: string): Promise<User[]>;
  
  // Task methods
  getTasks(type?: string): Promise<Task[]>;
  getTaskById(id: number): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, task: Partial<Task>): Promise<Task | undefined>;
  deleteTask(id: number): Promise<boolean>;
  
  // UserTask methods
  getUserTasks(userId: number): Promise<(UserTask & { task: Task })[]>;
  getUserTaskById(userId: number, taskId: number): Promise<UserTask | undefined>;
  createUserTask(userTask: InsertUserTask): Promise<UserTask>;
  updateUserTaskProgress(userId: number, taskId: number, progress: number): Promise<UserTask | undefined>;
  completeUserTask(userId: number, taskId: number): Promise<UserTask | undefined>;
  
  // BoostType methods
  getBoostTypes(): Promise<BoostType[]>;
  getBoostTypeById(id: number): Promise<BoostType | undefined>;
  createBoostType(boostType: InsertBoostType): Promise<BoostType>;
  updateBoostType(id: number, boostType: Partial<BoostType>): Promise<BoostType | undefined>;
  deleteBoostType(id: number): Promise<boolean>;
  
  // UserBoost methods
  getUserBoosts(userId: number): Promise<(UserBoost & { boostType: BoostType })[]>;
  getUserActiveBoosts(userId: number): Promise<(UserBoost & { boostType: BoostType })[]>;
  createUserBoost(userBoost: InsertUserBoost): Promise<UserBoost>;
  deactivateExpiredBoosts(): Promise<number>; // Returns count of deactivated boosts
  
  // Referral methods
  getReferrals(referrerId: number): Promise<(Referral & { referred: User })[]>;
  createReferral(referral: InsertReferral): Promise<Referral>;
  getReferralCount(userId: number): Promise<number>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User> = new Map();
  private tasks: Map<number, Task> = new Map();
  private userTasks: Map<string, UserTask> = new Map(); // key: `${userId}-${taskId}`
  private boostTypes: Map<number, BoostType> = new Map();
  private userBoosts: Map<number, UserBoost> = new Map();
  private referrals: Map<number, Referral> = new Map();
  
  private userIdCounter = 1;
  private taskIdCounter = 1;
  private userTaskIdCounter = 1;
  private boostTypeIdCounter = 1;
  private userBoostIdCounter = 1;
  private referralIdCounter = 1;
  
  constructor() {
    // Initialize with some default data
    this.initializeDefaultData();
  }
  
  private initializeDefaultData() {
    // Add default boost types
    this.createBoostType({
      name: "Hız Boost",
      description: "Kazım hızını 24 saat boyunca 1.5x artır",
      multiplier: 150, // 1.5x
      durationHours: 24,
      price: 500,
      isActive: true,
      iconName: "rocket",
      colorClass: "blue",
      isPopular: false
    });
    
    this.createBoostType({
      name: "Süper Boost",
      description: "Kazım hızını 24 saat boyunca 2x artır",
      multiplier: 200, // 2x
      durationHours: 24,
      price: 1000,
      isActive: true,
      iconName: "rocket",
      colorClass: "purple",
      isPopular: false
    });
    
    this.createBoostType({
      name: "Mega Boost",
      description: "Kazım hızını 24 saat boyunca 3x artır",
      multiplier: 300, // 3x
      durationHours: 24,
      price: 2000,
      isActive: true,
      iconName: "rocket",
      colorClass: "yellow",
      isPopular: false
    });
    
    this.createBoostType({
      name: "Ultra Boost",
      description: "Kazım hızını 7 gün boyunca 2x artır",
      multiplier: 200, // 2x
      durationHours: 168, // 7 days
      price: 5000,
      isActive: true,
      iconName: "rocket",
      colorClass: "red",
      isPopular: true
    });
    
    // Add default tasks
    this.createTask({
      title: "Uygulamayı Aç",
      description: "Uygulamayı günde bir kez aç",
      type: "daily",
      points: 10,
      requiredAmount: 1,
      isActive: true,
      telegramAction: "open_app",
      telegramTarget: null
    });
    
    this.createTask({
      title: "Gruba Mesaj Gönder",
      description: "Telegram grubuna en az 3 mesaj gönder",
      type: "daily",
      points: 50,
      requiredAmount: 3,
      isActive: true,
      telegramAction: "send_message",
      telegramTarget: "@mining_group"
    });
    
    this.createTask({
      title: "5 Arkadaş Davet Et",
      description: "5 arkadaşını referans koduyla davet et",
      type: "weekly",
      points: 200,
      requiredAmount: 5,
      isActive: true,
      telegramAction: "invite_friends",
      telegramTarget: null
    });
    
    this.createTask({
      title: "Kanala Katıl",
      description: "Resmi duyuru kanalımıza katıl",
      type: "special",
      points: 100,
      requiredAmount: 1,
      isActive: true,
      telegramAction: "join_channel",
      telegramTarget: "@mining_channel"
    });
  }
  
  // User methods
  async getUserByTelegramId(telegramId: string): Promise<User | undefined> {
    const user = Array.from(this.users.values()).find(u => u.telegramId === telegramId);
    return user;
  }
  
  async createUser(userData: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const user: User = {
      ...userData,
      id,
      level: 1,
      points: 0,
      miningSpeed: 10,
      lastMiningTime: new Date(),
      completedTasksCount: 0,
      boostUsageCount: 0,
      joinDate: new Date()
    };
    
    this.users.set(id, user);
    return user;
  }
  
  async updateUserPoints(userId: number, points: number): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;
    
    const updatedUser = {
      ...user,
      points: user.points + points
    };
    
    this.users.set(userId, updatedUser);
    return updatedUser;
  }
  
  async getUserById(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }
  
  async updateUserMiningSpeed(userId: number, speed: number): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;
    
    const updatedUser = {
      ...user,
      miningSpeed: speed
    };
    
    this.users.set(userId, updatedUser);
    return updatedUser;
  }
  
  async updateUserLastMiningTime(userId: number): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;
    
    const updatedUser = {
      ...user,
      lastMiningTime: new Date()
    };
    
    this.users.set(userId, updatedUser);
    return updatedUser;
  }
  
  async getUsersByReferralCode(referralCode: string): Promise<User[]> {
    return Array.from(this.users.values()).filter(u => u.referralCode === referralCode);
  }
  
  // Task methods
  async getTasks(type?: string): Promise<Task[]> {
    const allTasks = Array.from(this.tasks.values());
    if (type) {
      return allTasks.filter(task => task.type === type && task.isActive);
    }
    return allTasks.filter(task => task.isActive);
  }
  
  async getTaskById(id: number): Promise<Task | undefined> {
    return this.tasks.get(id);
  }
  
  async createTask(taskData: InsertTask): Promise<Task> {
    const id = this.taskIdCounter++;
    const task: Task = {
      ...taskData,
      id
    };
    
    this.tasks.set(id, task);
    return task;
  }
  
  async updateTask(id: number, taskData: Partial<Task>): Promise<Task | undefined> {
    const task = this.tasks.get(id);
    if (!task) return undefined;
    
    const updatedTask = {
      ...task,
      ...taskData
    };
    
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }
  
  async deleteTask(id: number): Promise<boolean> {
    return this.tasks.delete(id);
  }
  
  // UserTask methods
  async getUserTasks(userId: number): Promise<(UserTask & { task: Task })[]> {
    const userTaskEntries = Array.from(this.userTasks.values())
      .filter(ut => ut.userId === userId);
    
    return userTaskEntries.map(ut => {
      const task = this.tasks.get(ut.taskId)!;
      return { ...ut, task };
    });
  }
  
  async getUserTaskById(userId: number, taskId: number): Promise<UserTask | undefined> {
    return this.userTasks.get(`${userId}-${taskId}`);
  }
  
  async createUserTask(userTaskData: InsertUserTask): Promise<UserTask> {
    const id = this.userTaskIdCounter++;
    const userTask: UserTask = {
      ...userTaskData,
      id,
      progress: 0,
      isCompleted: false,
      completedAt: null,
      createdAt: new Date()
    };
    
    this.userTasks.set(`${userTaskData.userId}-${userTaskData.taskId}`, userTask);
    return userTask;
  }
  
  async updateUserTaskProgress(userId: number, taskId: number, progress: number): Promise<UserTask | undefined> {
    const key = `${userId}-${taskId}`;
    const userTask = this.userTasks.get(key);
    if (!userTask) return undefined;
    
    const task = this.tasks.get(taskId);
    if (!task) return undefined;
    
    const isCompleted = progress >= task.requiredAmount;
    const completedAt = isCompleted ? new Date() : userTask.completedAt;
    
    const updatedUserTask: UserTask = {
      ...userTask,
      progress,
      isCompleted,
      completedAt
    };
    
    this.userTasks.set(key, updatedUserTask);
    
    // If task was just completed, update user stats
    if (isCompleted && !userTask.isCompleted) {
      const user = this.users.get(userId);
      if (user) {
        const updatedUser = {
          ...user,
          points: user.points + task.points,
          completedTasksCount: user.completedTasksCount + 1
        };
        this.users.set(userId, updatedUser);
      }
    }
    
    return updatedUserTask;
  }
  
  async completeUserTask(userId: number, taskId: number): Promise<UserTask | undefined> {
    const key = `${userId}-${taskId}`;
    const userTask = this.userTasks.get(key);
    if (!userTask) return undefined;
    
    const task = this.tasks.get(taskId);
    if (!task) return undefined;
    
    const updatedUserTask: UserTask = {
      ...userTask,
      progress: task.requiredAmount,
      isCompleted: true,
      completedAt: new Date()
    };
    
    this.userTasks.set(key, updatedUserTask);
    
    // Update user points and stats
    if (!userTask.isCompleted) {
      const user = this.users.get(userId);
      if (user) {
        const updatedUser = {
          ...user,
          points: user.points + task.points,
          completedTasksCount: user.completedTasksCount + 1
        };
        this.users.set(userId, updatedUser);
      }
    }
    
    return updatedUserTask;
  }
  
  // BoostType methods
  async getBoostTypes(): Promise<BoostType[]> {
    return Array.from(this.boostTypes.values()).filter(bt => bt.isActive);
  }
  
  async getBoostTypeById(id: number): Promise<BoostType | undefined> {
    return this.boostTypes.get(id);
  }
  
  async createBoostType(boostTypeData: InsertBoostType): Promise<BoostType> {
    const id = this.boostTypeIdCounter++;
    const boostType: BoostType = {
      ...boostTypeData,
      id
    };
    
    this.boostTypes.set(id, boostType);
    return boostType;
  }
  
  async updateBoostType(id: number, boostTypeData: Partial<BoostType>): Promise<BoostType | undefined> {
    const boostType = this.boostTypes.get(id);
    if (!boostType) return undefined;
    
    const updatedBoostType = {
      ...boostType,
      ...boostTypeData
    };
    
    this.boostTypes.set(id, updatedBoostType);
    return updatedBoostType;
  }
  
  async deleteBoostType(id: number): Promise<boolean> {
    return this.boostTypes.delete(id);
  }
  
  // UserBoost methods
  async getUserBoosts(userId: number): Promise<(UserBoost & { boostType: BoostType })[]> {
    const userBoostEntries = Array.from(this.userBoosts.values())
      .filter(ub => ub.userId === userId);
    
    return userBoostEntries.map(ub => {
      const boostType = this.boostTypes.get(ub.boostTypeId)!;
      return { ...ub, boostType };
    });
  }
  
  async getUserActiveBoosts(userId: number): Promise<(UserBoost & { boostType: BoostType })[]> {
    const now = new Date();
    const userBoostEntries = Array.from(this.userBoosts.values())
      .filter(ub => ub.userId === userId && ub.isActive && new Date(ub.endTime) > now);
    
    return userBoostEntries.map(ub => {
      const boostType = this.boostTypes.get(ub.boostTypeId)!;
      return { ...ub, boostType };
    });
  }
  
  async createUserBoost(userBoostData: InsertUserBoost): Promise<UserBoost> {
    const id = this.userBoostIdCounter++;
    const startTime = new Date();
    const userBoost: UserBoost = {
      ...userBoostData,
      id,
      startTime,
      isActive: true
    };
    
    this.userBoosts.set(id, userBoost);
    
    // Update user's boost usage count
    const user = this.users.get(userBoostData.userId);
    if (user) {
      const updatedUser = {
        ...user,
        boostUsageCount: user.boostUsageCount + 1
      };
      this.users.set(user.id, updatedUser);
    }
    
    return userBoost;
  }
  
  async deactivateExpiredBoosts(): Promise<number> {
    const now = new Date();
    let count = 0;
    
    for (const [id, boost] of this.userBoosts.entries()) {
      if (boost.isActive && new Date(boost.endTime) <= now) {
        const updatedBoost = {
          ...boost,
          isActive: false
        };
        this.userBoosts.set(id, updatedBoost);
        count++;
      }
    }
    
    return count;
  }
  
  // Referral methods
  async getReferrals(referrerId: number): Promise<(Referral & { referred: User })[]> {
    const referralEntries = Array.from(this.referrals.values())
      .filter(r => r.referrerId === referrerId);
    
    return referralEntries.map(r => {
      const referred = this.users.get(r.referredId)!;
      return { ...r, referred };
    });
  }
  
  async createReferral(referralData: InsertReferral): Promise<Referral> {
    const id = this.referralIdCounter++;
    const referral: Referral = {
      ...referralData,
      id,
      createdAt: new Date()
    };
    
    this.referrals.set(id, referral);
    
    // Award points to the referrer
    const referrer = this.users.get(referralData.referrerId);
    if (referrer) {
      const updatedReferrer = {
        ...referrer,
        points: referrer.points + referralData.points,
        // Boost referrer's mining speed by 5%
        miningSpeed: Math.floor(referrer.miningSpeed * 1.05)
      };
      this.users.set(referrer.id, updatedReferrer);
    }
    
    return referral;
  }
  
  async getReferralCount(userId: number): Promise<number> {
    return Array.from(this.referrals.values())
      .filter(r => r.referrerId === userId).length;
  }
}

export const storage = new MemStorage();
