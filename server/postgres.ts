import pool from './db';
import { IStorage } from './storage';
import type { User, Task, BoostType, UserBoost, UserTask, Referral, InsertUser } from '@shared/schema';

export class PostgresStorage implements IStorage {
  // User methods
  async getUserByTelegramId(telegramId: string): Promise<User | undefined> {
    try {
      const result = await pool.query(
        'SELECT * FROM users WHERE telegram_id = $1',
        [telegramId]
      );
      return result.rows[0] || undefined;
    } catch (error) {
      console.error('Error getting user by telegram ID:', error);
      return undefined;
    }
  }

  async createUser(userData: InsertUser): Promise<User> {
    try {
      // Varsayılan değerler ile
      const defaultValues = {
        level: 1,
        points: 0,
        miningSpeed: 10,
        lastMiningTime: new Date(),
        completedTasksCount: 0,
        boostUsageCount: 0,
        joinDate: new Date()
      };
      
      const result = await pool.query(
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
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async updateUserPoints(userId: number, points: number): Promise<User | undefined> {
    try {
      console.log(`Updating points for user ${userId}: +${points} points`);
      
      const userResult = await pool.query(
        'SELECT points FROM users WHERE id = $1',
        [userId]
      );
      
      if (userResult.rows.length === 0) {
        console.error(`User not found with ID: ${userId}`);
        return undefined;
      }
      
      const currentPoints = userResult.rows[0].points || 0;
      console.log(`Current points: ${currentPoints}, new total: ${currentPoints + points}`);
      
      const newPoints = currentPoints + points;
      
      const result = await pool.query(
        'UPDATE users SET points = $1 WHERE id = $2 RETURNING *',
        [newPoints, userId]
      );
      
      console.log(`User points updated successfully:`, result.rows[0]);
      return result.rows[0];
    } catch (error) {
      console.error('Error updating user points:', error);
      return undefined;
    }
  }

  async getUserById(id: number): Promise<User | undefined> {
    try {
      const result = await pool.query(
        'SELECT * FROM users WHERE id = $1',
        [id]
      );
      return result.rows[0] || undefined;
    } catch (error) {
      console.error('Error getting user by ID:', error);
      return undefined;
    }
  }

  async updateUserMiningSpeed(userId: number, speed: number): Promise<User | undefined> {
    try {
      const result = await pool.query(
        'UPDATE users SET mining_speed = $1 WHERE id = $2 RETURNING *',
        [speed, userId]
      );
      return result.rows[0] || undefined;
    } catch (error) {
      console.error('Error updating user mining speed:', error);
      return undefined;
    }
  }

  async updateUserLastMiningTime(userId: number): Promise<User | undefined> {
    try {
      const result = await pool.query(
        'UPDATE users SET last_mining_time = $1 WHERE id = $2 RETURNING *',
        [new Date(), userId]
      );
      return result.rows[0] || undefined;
    } catch (error) {
      console.error('Error updating user last mining time:', error);
      return undefined;
    }
  }

  async getUsersByReferralCode(referralCode: string): Promise<User[]> {
    try {
      const result = await pool.query(
        'SELECT * FROM users WHERE referral_code = $1',
        [referralCode]
      );
      return result.rows;
    } catch (error) {
      console.error('Error getting users by referral code:', error);
      return [];
    }
  }

  // Task methods
  async getTasks(type?: string): Promise<Task[]> {
    try {
      let query = 'SELECT * FROM tasks WHERE is_active = true';
      const params: any[] = [];
      
      if (type) {
        query += ' AND type = $1';
        params.push(type);
      }
      
      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('Error getting tasks:', error);
      return [];
    }
  }

  async getTaskById(id: number): Promise<Task | undefined> {
    try {
      const result = await pool.query(
        'SELECT * FROM tasks WHERE id = $1',
        [id]
      );
      return result.rows[0] || undefined;
    } catch (error) {
      console.error('Error getting task by ID:', error);
      return undefined;
    }
  }

  async createTask(taskData: Partial<Task>): Promise<Task> {
    try {
      // Eğer görev türü belirtilmemişse varsayılan olarak 'daily' ata
      const taskType = taskData.type || 'daily';
      
      // Görev türüne göre varsayılan değerleri belirle
      let defaultPoints = 50;
      let defaultRequiredAmount = 1;
      
      switch (taskType) {
        case 'social':
          defaultPoints = 100;
          defaultRequiredAmount = 1;
          break;
        case 'weekly':
          defaultPoints = 200;
          defaultRequiredAmount = 5;
          break;
        case 'referral':
          defaultPoints = 300;
          defaultRequiredAmount = 1;
          break;
        case 'milestone':
          defaultPoints = 500;
          defaultRequiredAmount = 1;
          break;
        case 'special':
          defaultPoints = 1000;
          defaultRequiredAmount = 1;
          break;
        case 'daily':
        default:
          defaultPoints = 50;
          defaultRequiredAmount = 1;
          break;
      }
      
      const result = await pool.query(
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
          taskData.isActive !== undefined ? taskData.isActive : true,
          taskData.telegramAction,
          taskData.telegramTarget
        ]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  }

  async updateTask(id: number, taskData: Partial<Task>): Promise<Task | undefined> {
    try {
      const fields = Object.keys(taskData)
        .map((key, i) => `${key} = $${i + 1}`)
        .join(', ');
      
      const values = Object.values(taskData);
      values.push(id);
      
      const result = await pool.query(
        `UPDATE tasks SET ${fields} WHERE id = $${values.length} RETURNING *`,
        values
      );
      
      return result.rows[0] || undefined;
    } catch (error) {
      console.error('Error updating task:', error);
      return undefined;
    }
  }

  async deleteTask(id: number): Promise<boolean> {
    try {
      const result = await pool.query(
        'DELETE FROM tasks WHERE id = $1 RETURNING id',
        [id]
      );
      return result.rowCount ? result.rowCount > 0 : false;
    } catch (error) {
      console.error('Error deleting task:', error);
      return false;
    }
  }

  // UserTask methods
  async getUserTasks(userId: number): Promise<(UserTask & { task: Task })[]> {
    try {
      const result = await pool.query(
        `SELECT ut.*, t.* FROM user_tasks ut
         JOIN tasks t ON ut.task_id = t.id
         WHERE ut.user_id = $1`,
        [userId]
      );
      
      return result.rows.map(row => {
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
      console.error('Error getting user tasks:', error);
      return [];
    }
  }

  async getUserTaskById(userId: number, taskId: number): Promise<UserTask | undefined> {
    try {
      const result = await pool.query(
        'SELECT * FROM user_tasks WHERE user_id = $1 AND task_id = $2',
        [userId, taskId]
      );
      return result.rows[0] || undefined;
    } catch (error) {
      console.error('Error getting user task by ID:', error);
      return undefined;
    }
  }

  async createUserTask(userTaskData: Partial<UserTask>): Promise<UserTask> {
    try {
      const result = await pool.query(
        `INSERT INTO user_tasks (
          user_id, task_id, progress, is_completed, completed_at, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [
          userTaskData.userId,
          userTaskData.taskId,
          userTaskData.progress || 0,
          userTaskData.isCompleted || false,
          userTaskData.completedAt || null,
          userTaskData.createdAt || new Date()
        ]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Error creating user task:', error);
      throw error;
    }
  }

  async updateUserTaskProgress(userId: number, taskId: number, progress: number): Promise<UserTask> {
    try {
      console.log(`Updating task progress for user ${userId}, task ${taskId}, progress: ${progress}`);
      
      // Get task details to check required amount
      const taskResult = await pool.query(
        'SELECT required_amount FROM tasks WHERE id = $1',
        [taskId]
      );
      
      if (taskResult.rows.length === 0) {
        console.error(`Task not found with ID: ${taskId}`);
        throw new Error('Task not found');
      }
      
      const requiredAmount = taskResult.rows[0].required_amount;
      console.log(`Task requiredAmount: ${requiredAmount}`);
      
      // Get current user task progress
      const userTaskResult = await pool.query(
        'SELECT progress, is_completed FROM user_tasks WHERE user_id = $1 AND task_id = $2',
        [userId, taskId]
      );
      
      let userTask;
      if (userTaskResult.rows.length === 0) {
        // Create new user task if it doesn't exist
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
      
      const updateResult = await pool.query(
        `UPDATE user_tasks SET 
          progress = $1, 
          is_completed = $2,
          completed_at = $3
         WHERE user_id = $4 AND task_id = $5 RETURNING *`,
        [
          newProgress,
          isCompleted,
          isCompleted ? new Date() : null,
          userId,
          taskId
        ]
      );
      
      const updatedTask = updateResult.rows[0];
      console.log(`Task progress updated successfully:`, updatedTask);
      
      return updatedTask;
    } catch (error) {
      console.error('Error updating user task progress:', error);
      throw error;
    }
  }

  async completeTask(userId: number, taskId: number, userTelegramId: string): Promise<UserTask | null> {
    try {
      console.log(`Completing task for user ${userId}, task ${taskId}`);
      
      // Get task details
      const taskResult = await pool.query(
        'SELECT * FROM tasks WHERE id = $1',
        [taskId]
      );
      const task = taskResult.rows[0];
      
      if (!task) {
        console.error(`Task not found with ID: ${taskId}`);
        return null;
      }
      
      console.log(`Task found:`, task);

      // Check if user task exists and is not already completed
      const userTaskResult = await pool.query(
        'SELECT * FROM user_tasks WHERE user_id = $1 AND task_id = $2',
        [userId, taskId]
      );
      
      console.log(`User task found:`, userTaskResult.rows[0] || 'No existing user task');

      let userTask;
      const userTaskExists = userTaskResult.rows.length > 0;
      if (userTaskExists) {
        const existingUserTask = userTaskResult.rows[0];
        
        if (existingUserTask.is_completed) {
          console.log(`Task already completed for user ${userId}`);
          return existingUserTask; // Already completed
        }
        
        // Update existing user task
        const updateResult = await pool.query(
          `UPDATE user_tasks SET 
            progress = $1, 
            is_completed = true,
            completed_at = $2
            WHERE user_id = $3 AND task_id = $4 RETURNING *`,
          [
            task.required_amount,
            new Date(),
            userId,
            taskId
          ]
        );
        userTask = updateResult.rows[0];
        console.log(`Updated user task:`, userTask);
      } else {
        // Create new user task if it doesn't exist
        console.log(`Creating new user task for user ${userId} and task ${taskId}`);
        userTask = await this.createUserTask({
          userId,
          taskId,
          progress: task.required_amount,
          isCompleted: true,
          completedAt: new Date()
        });
        console.log(`Created new user task:`, userTask);
      }
      
      // Award points to user
      console.log(`Awarding ${task.points} points to user ${userId}`);
      const updatedUser = await this.updateUserPoints(userId, task.points);
      console.log(`User points updated:`, updatedUser?.points || 'Failed to update user points');
      
      // Increment completed tasks count
      console.log(`Incrementing completed tasks count for user ${userId}`);
      await pool.query(
        'UPDATE users SET completed_tasks_count = completed_tasks_count + 1 WHERE id = $1',
        [userId]
      );
      
      return userTask;
    } catch (error) {
      console.error('Error completing task:', error);
      return null;
    }
  }

  async completeUserTask(userId: number, taskId: number): Promise<UserTask | undefined> {
    try {
      const result = await this.completeTask(userId, taskId, '');
      return result || undefined;
    } catch (error) {
      console.error('Error in completeUserTask:', error);
      return undefined;
    }
  }

  // BoostType methods
  async getBoostTypes(): Promise<BoostType[]> {
    try {
      const result = await pool.query('SELECT * FROM boost_types WHERE is_active = true');
      return result.rows;
    } catch (error) {
      console.error('Error getting boost types:', error);
      return [];
    }
  }

  async getBoostTypeById(id: number): Promise<BoostType | undefined> {
    try {
      const result = await pool.query(
        'SELECT * FROM boost_types WHERE id = $1',
        [id]
      );
      return result.rows[0] || undefined;
    } catch (error) {
      console.error('Error getting boost type by ID:', error);
      return undefined;
    }
  }

  async createBoostType(boostTypeData: Partial<BoostType>): Promise<BoostType> {
    try {
      const result = await pool.query(
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
          boostTypeData.isActive !== undefined ? boostTypeData.isActive : true,
          boostTypeData.iconName,
          boostTypeData.colorClass,
          boostTypeData.isPopular || false
        ]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Error creating boost type:', error);
      throw error;
    }
  }

  async updateBoostType(id: number, boostTypeData: Partial<BoostType>): Promise<BoostType | undefined> {
    try {
      // Convert camelCase keys to snake_case for the database
      const snakeCaseData: Record<string, any> = {};
      for (const [key, value] of Object.entries(boostTypeData)) {
        const snakeKey = key
          .replace(/([A-Z])/g, '_$1')
          .toLowerCase();
        snakeCaseData[snakeKey] = value;
      }
      
      const fields = Object.keys(snakeCaseData)
        .map((key, i) => `${key} = $${i + 1}`)
        .join(', ');
      
      const values = Object.values(snakeCaseData);
      values.push(id);
      
      const result = await pool.query(
        `UPDATE boost_types SET ${fields} WHERE id = $${values.length} RETURNING *`,
        values
      );
      
      return result.rows[0] || undefined;
    } catch (error) {
      console.error('Error updating boost type:', error);
      return undefined;
    }
  }

  async deleteBoostType(id: number): Promise<boolean> {
    try {
      const result = await pool.query(
        'DELETE FROM boost_types WHERE id = $1 RETURNING id',
        [id]
      );
      return result.rowCount ? result.rowCount > 0 : false;
    } catch (error) {
      console.error('Error deleting boost type:', error);
      return false;
    }
  }

  // UserBoost methods
  async getUserBoosts(userId: number): Promise<(UserBoost & { boostType: BoostType })[]> {
    try {
      const result = await pool.query(
        `SELECT ub.*, bt.* FROM user_boosts ub
         JOIN boost_types bt ON ub.boost_type_id = bt.id
         WHERE ub.user_id = $1 AND ub.is_active = true`,
        [userId]
      );
      
      return result.rows.map(row => {
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
      console.error('Error getting user boosts:', error);
      return [];
    }
  }

  async getUserActiveBoosts(userId: number): Promise<(UserBoost & { boostType: BoostType })[]> {
    try {
      const result = await pool.query(
        `SELECT ub.*, bt.* FROM user_boosts ub
         JOIN boost_types bt ON ub.boost_type_id = bt.id
         WHERE ub.user_id = $1 AND ub.is_active = true AND ub.end_time > NOW()`,
        [userId]
      );
      
      return result.rows.map(row => {
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
      console.error('Error getting user active boosts:', error);
      return [];
    }
  }

  async createUserBoost(userBoostData: Partial<UserBoost>): Promise<UserBoost> {
    try {
      // Get boost type to calculate end time
      const boostTypeResult = await pool.query(
        'SELECT duration_hours FROM boost_types WHERE id = $1',
        [userBoostData.boostTypeId]
      );
      
      if (boostTypeResult.rows.length === 0) {
        throw new Error('Boost type not found');
      }
      
      const durationHours = boostTypeResult.rows[0].duration_hours;
      const startTime = userBoostData.startTime || new Date();
      const endTime = new Date(startTime);
      endTime.setHours(endTime.getHours() + durationHours);
      
      const result = await pool.query(
        `INSERT INTO user_boosts (
          user_id, boost_type_id, is_active, start_time, end_time
        ) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [
          userBoostData.userId,
          userBoostData.boostTypeId,
          userBoostData.isActive !== undefined ? userBoostData.isActive : true,
          startTime,
          endTime
        ]
      );
      
      // Increment boost usage count
      await pool.query(
        'UPDATE users SET boost_usage_count = boost_usage_count + 1 WHERE id = $1',
        [userBoostData.userId]
      );
      
      return result.rows[0];
    } catch (error) {
      console.error('Error creating user boost:', error);
      throw error;
    }
  }

  async deactivateExpiredBoosts(): Promise<number> {
    try {
      const result = await pool.query(
        `UPDATE user_boosts 
         SET is_active = false 
         WHERE is_active = true AND end_time < NOW() 
         RETURNING id`,
      );
      
      return result.rowCount || 0;
    } catch (error) {
      console.error('Error deactivating expired boosts:', error);
      return 0;
    }
  }

  // Referral methods
  async getReferrals(referrerId: number): Promise<(Referral & { referred: User })[]> {
    try {
      const result = await pool.query(
        `SELECT r.*, u.* FROM referrals r
         JOIN users u ON r.referred_id = u.id
         WHERE r.referrer_id = $1`,
        [referrerId]
      );
      
      return result.rows.map(row => {
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
      console.error('Error getting referrals:', error);
      return [];
    }
  }

  async createReferral(referralData: Partial<Referral>): Promise<Referral> {
    try {
      const result = await pool.query(
        `INSERT INTO referrals (
          referrer_id, referred_id, points, created_at
        ) VALUES ($1, $2, $3, $4) RETURNING *`,
        [
          referralData.referrerId,
          referralData.referredId,
          referralData.points || 0,
          referralData.createdAt || new Date()
        ]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Error creating referral:', error);
      throw error;
    }
  }

  async getReferralCount(userId: number): Promise<number> {
    try {
      const result = await pool.query(
        'SELECT COUNT(*) as count FROM referrals WHERE referrer_id = $1',
        [userId]
      );
      return parseInt(result.rows[0].count);
    } catch (error) {
      console.error('Error getting referral count:', error);
      return 0;
    }
  }

  // Telegram görevleri oluşturmak için yardımcı fonksiyon
  async createTelegramTasks(): Promise<Task[]> {
    try {
      const tasks: Task[] = [];
      
      // Kanal katılma görevi örneği
      const channelTask = await this.createTask({
        title: "Telegram Kanalına Katıl",
        description: "Resmi Telegram kanalımıza katılarak güncellemelerden ve duyurulardan haberdar ol.",
        type: "social",
        points: 150,
        requiredAmount: 1,
        isActive: true,
        telegramAction: "join_channel",
        telegramTarget: "https://t.me/taskboostofficial" // Gerçek kanal linkinizi buraya ekleyin
      });
      tasks.push(channelTask);
      
      // Grup katılma görevi örneği
      const groupTask = await this.createTask({
        title: "Telegram Grubuna Katıl",
        description: "Topluluğumuzla etkileşime geçmek için resmi Telegram grubumuza katıl.",
        type: "social",
        points: 100,
        requiredAmount: 1,
        isActive: true,
        telegramAction: "join_channel",
        telegramTarget: "https://t.me/taskboostcommunity" // Gerçek grup linkinizi buraya ekleyin
      });
      tasks.push(groupTask);
      
      // Davet görevi örneği
      const referralTask = await this.createTask({
        title: "Arkadaşlarını Davet Et",
        description: "Referans kodunu kullanarak 3 arkadaşını davet et ve ödül kazan.",
        type: "referral",
        points: 300,
        requiredAmount: 3,
        isActive: true,
        telegramAction: "invite_friends",
        telegramTarget: null
      });
      tasks.push(referralTask);
      
      // Bot mesaj gönderme görevi
      const botMessageTask = await this.createTask({
        title: "Bota Mesaj Gönder",
        description: "TaskBoost botuna /start komutu göndererek görevi tamamla.",
        type: "daily",
        points: 50,
        requiredAmount: 1,
        isActive: true,
        telegramAction: "send_message",
        telegramTarget: "https://t.me/taskboost_bot" // Gerçek bot linkinizi buraya ekleyin
      });
      tasks.push(botMessageTask);
      
      return tasks;
    } catch (error) {
      console.error('Error creating Telegram tasks:', error);
      return [];
    }
  }

  // İlerleme tabanlı görevler için yardımcı fonksiyonlar
  async createProgressTasks(): Promise<Task[]> {
    try {
      const tasks: Task[] = [];
      
      // Günlük giriş görevi
      const dailyLoginTask = await this.createTask({
        title: "Günlük Giriş",
        description: "Uygulamaya her gün giriş yaparak puan kazanın.",
        type: "daily",
        points: 50,
        requiredAmount: 1,
        isActive: true,
        telegramAction: "open_app",
        telegramTarget: null
      });
      tasks.push(dailyLoginTask);
      
      // Madencilik görevi
      const miningTask = await this.createTask({
        title: "Madencilik Yap",
        description: "Uygulamayı kullanarak madencilik yapın ve puan kazanın.",
        type: "daily",
        points: 100,
        requiredAmount: 5,
        isActive: true,
        telegramAction: null,
        telegramTarget: null
      });
      tasks.push(miningTask);
      
      // İlerleme tabanlı haftalık görev
      const weeklyProgressTask = await this.createTask({
        title: "Haftalık Hedef",
        description: "Bu hafta 500 puan toplayın.",
        type: "weekly",
        points: 200,
        requiredAmount: 500,
        isActive: true,
        telegramAction: null,
        telegramTarget: null
      });
      tasks.push(weeklyProgressTask);
      
      // İlerleme tabanlı profil görevi
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
      tasks.push(profileTask);
      
      // Arkadaş davet etme görevi
      const referralTask = await this.createTask({
        title: "Arkadaşlarını Davet Et",
        description: "5 arkadaşını davet et ve ekstra puan kazan.",
        type: "referral",
        points: 500,
        requiredAmount: 5,
        isActive: true,
        telegramAction: "invite_friends",
        telegramTarget: null
      });
      tasks.push(referralTask);
      
      return tasks;
    } catch (error) {
      console.error('Error creating progress tasks:', error);
      return [];
    }
  }

  // Kullanıcı görev ilerlemesini güncelleme metodu
  async incrementTaskProgress(userId: number, taskId: number, incrementAmount: number = 1): Promise<UserTask | null> {
    try {
      console.log(`Incrementing task progress for user ${userId}, task ${taskId}, amount ${incrementAmount}`);

      // Önce görev detaylarını al
      const taskResult = await pool.query(
        'SELECT * FROM tasks WHERE id = $1',
        [taskId]
      );
      const task = taskResult.rows[0];
      if (!task) {
        console.error(`Task not found with ID: ${taskId}`);
        return null;
      }
      console.log(`Task found:`, task);

      // Kullanıcı görevinin mevcut durumunu kontrol et
      const userTaskResult = await pool.query(
        'SELECT * FROM user_tasks WHERE user_id = $1 AND task_id = $2',
        [userId, taskId]
      );
      console.log(`User task found:`, userTaskResult.rows[0] || 'No existing user task');

      let userTask;
      if (userTaskResult.rows.length > 0) {
        const existingUserTask = userTaskResult.rows[0];

        // Görev zaten tamamlanmışsa hiçbir şey yapma
        if (existingUserTask.is_completed) {
          console.log(`Task is already completed for user ${userId}`);
          return existingUserTask;
        }

        // Yeni ilerleme değerini hesapla
        const newProgress = Math.min(existingUserTask.progress + incrementAmount, task.required_amount);
        const isCompleted = newProgress >= task.required_amount;
        console.log(`Updating progress from ${existingUserTask.progress} to ${newProgress}, completed: ${isCompleted}`);

        // Kullanıcı görevini güncelle
        const updateResult = await pool.query(
          `UPDATE user_tasks SET
            progress = $1,
            is_completed = $2,
            completed_at = $3
           WHERE user_id = $4 AND task_id = $5 RETURNING *`,
          [
            newProgress,
            isCompleted,
            isCompleted ? new Date() : null,
            userId,
            taskId
          ]
        );
        userTask = updateResult.rows[0];
        console.log(`Updated user task:`, userTask);

        // Eğer görev tamamlandıysa puanları ver
        if (isCompleted) {
          console.log(`Task completed. Awarding ${task.points} points to user ${userId}`);
          const updatedUser = await this.updateUserPoints(userId, task.points);
          console.log(`User points updated:`, updatedUser?.points || 'Failed to update user points');

          // Tamamlanan görev sayısını artır
          await pool.query(
            'UPDATE users SET completed_tasks_count = completed_tasks_count + 1 WHERE id = $1',
            [userId]
          );
        }
      } else {
        // Görev kaydı yoksa yeni bir kayıt oluştur
        console.log(`Creating new user task for user ${userId} and task ${taskId}`);
        const isInitiallyCompleted = incrementAmount >= task.required_amount;
        
        userTask = await this.createUserTask({
          userId,
          taskId,
          progress: Math.min(incrementAmount, task.required_amount),
          isCompleted: isInitiallyCompleted,
          completedAt: isInitiallyCompleted ? new Date() : null
        });
        
        console.log(`Created new user task:`, userTask);
        
        // Eğer görev tamamlandıysa puanları ver
        if (isInitiallyCompleted) {
          console.log(`Task completed immediately. Awarding ${task.points} points to user ${userId}`);
          const updatedUser = await this.updateUserPoints(userId, task.points);
          console.log(`User points updated:`, updatedUser?.points || 'Failed to update user points');

          // Tamamlanan görev sayısını artır
          await pool.query(
            'UPDATE users SET completed_tasks_count = completed_tasks_count + 1 WHERE id = $1',
            [userId]
          );
        }
      }
      
      return userTask;
    } catch (error) {
      console.error('Error incrementing task progress:', error);
      return null;
    }
  }
  
  // Haftalık görevleri sıfırlama fonksiyonu
  async resetWeeklyTasks(): Promise<number> {
    try {
      // Tüm haftalık görevleri bul
      const weeklyTasksResult = await pool.query(
        "SELECT id FROM tasks WHERE type = 'weekly' AND is_active = true"
      );
      
      if (weeklyTasksResult.rows.length === 0) return 0;
      
      const weeklyTaskIds = weeklyTasksResult.rows.map(row => row.id);
      
      // Bu görevler için tüm kullanıcı ilerlemelerini sıfırla
      const resetResult = await pool.query(
        `UPDATE user_tasks SET 
          progress = 0, 
          is_completed = false,
          completed_at = NULL
         WHERE task_id = ANY($1) RETURNING id`,
        [weeklyTaskIds]
      );
      
      return resetResult.rowCount || 0;
    } catch (error) {
      console.error('Error resetting weekly tasks:', error);
      return 0;
    }
  }
} 