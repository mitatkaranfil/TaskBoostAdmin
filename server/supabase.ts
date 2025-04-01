import { createClient } from '@supabase/supabase-js';
import type { User, Task, BoostType, UserBoost, UserTask, Referral } from '@shared/schema';
import { IStorage } from './storage';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export class SupabaseStorage implements IStorage {
  // User methods
  async getUserByTelegramId(telegramId: string): Promise<User | undefined> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', telegramId)
      .single();

    if (error) {
      console.error('Error getting user by telegram ID:', error);
      return undefined;
    }

    return data;
  }

  async createUser(userData: Partial<User>): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .insert([userData])
      .select()
      .single();

    if (error) {
      console.error('Error creating user:', error);
      throw error;
    }

    return data;
  }

  async updateUserPoints(userId: number, points: number): Promise<User | undefined> {
    const { data: user } = await supabase
      .from('users')
      .select('points')
      .eq('id', userId)
      .single();

    if (!user) return undefined;

    const { data, error } = await supabase
      .from('users')
      .update({ points: user.points + points })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating user points:', error);
      return undefined;
    }

    return data;
  }

  async getUserById(id: number): Promise<User | undefined> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error getting user by ID:', error);
      return undefined;
    }

    return data;
  }

  async updateUserMiningSpeed(userId: number, speed: number): Promise<User | undefined> {
    const { data, error } = await supabase
      .from('users')
      .update({ mining_speed: speed })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating user mining speed:', error);
      return undefined;
    }

    return data;
  }

  async updateUserLastMiningTime(userId: number): Promise<User | undefined> {
    const { data, error } = await supabase
      .from('users')
      .update({ last_mining_time: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating user last mining time:', error);
      return undefined;
    }

    return data;
  }

  async getUsersByReferralCode(referralCode: string): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('referral_code', referralCode);

    if (error) {
      console.error('Error getting users by referral code:', error);
      return [];
    }

    return data || [];
  }

  // Task methods
  async getTasks(type?: string): Promise<Task[]> {
    let query = supabase
      .from('tasks')
      .select('*')
      .eq('is_active', true);

    if (type) {
      query = query.eq('type', type);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error getting tasks:', error);
      return [];
    }

    return data || [];
  }

  async getTaskById(id: number): Promise<Task | undefined> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error getting task by ID:', error);
      return undefined;
    }

    return data;
  }

  async createTask(taskData: Partial<Task>): Promise<Task> {
    const { data, error } = await supabase
      .from('tasks')
      .insert([taskData])
      .select()
      .single();

    if (error) {
      console.error('Error creating task:', error);
      throw error;
    }

    return data;
  }

  async updateTask(id: number, taskData: Partial<Task>): Promise<Task | undefined> {
    const { data, error } = await supabase
      .from('tasks')
      .update(taskData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating task:', error);
      return undefined;
    }

    return data;
  }

  async deleteTask(id: number): Promise<boolean> {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting task:', error);
      return false;
    }

    return true;
  }

  // UserTask methods
  async getUserTasks(userId: number): Promise<(UserTask & { task: Task })[]> {
    const { data, error } = await supabase
      .from('user_tasks')
      .select('*, task:tasks(*)')
      .eq('user_id', userId);

    if (error) {
      console.error('Error getting user tasks:', error);
      return [];
    }

    return data || [];
  }

  async getUserTaskById(userId: number, taskId: number): Promise<UserTask | undefined> {
    const { data, error } = await supabase
      .from('user_tasks')
      .select('*')
      .eq('user_id', userId)
      .eq('task_id', taskId)
      .single();

    if (error) {
      console.error('Error getting user task by ID:', error);
      return undefined;
    }

    return data;
  }

  async createUserTask(userTaskData: Partial<UserTask>): Promise<UserTask> {
    const { data, error } = await supabase
      .from('user_tasks')
      .insert([userTaskData])
      .select()
      .single();

    if (error) {
      console.error('Error creating user task:', error);
      throw error;
    }

    return data;
  }

  async updateUserTaskProgress(userId: number, taskId: number, progress: number): Promise<UserTask | undefined> {
    const { data: task } = await supabase
      .from('tasks')
      .select('required_amount')
      .eq('id', taskId)
      .single();

    if (!task) {
      console.error('Task not found');
      return undefined;
    }

    const isCompleted = progress >= task.required_amount;
    const completedAt = isCompleted ? new Date().toISOString() : null;

    const { data, error } = await supabase
      .from('user_tasks')
      .upsert([{
        user_id: userId,
        task_id: taskId,
        progress,
        is_completed: isCompleted,
        completed_at: completedAt,
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      console.error('Error updating user task progress:', error);
      return undefined;
    }

    return data;
  }

  async completeUserTask(userId: number, taskId: number): Promise<UserTask | undefined> {
    const { data, error } = await supabase
      .from('user_tasks')
      .update({
        is_completed: true,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('task_id', taskId)
      .select()
      .single();

    if (error) {
      console.error('Error completing user task:', error);
      return undefined;
    }

    return data;
  }

  // BoostType methods
  async getBoostTypes(): Promise<BoostType[]> {
    const { data, error } = await supabase
      .from('boost_types')
      .select('*')
      .eq('is_active', true);

    if (error) {
      console.error('Error getting boost types:', error);
      return [];
    }

    return data || [];
  }

  async getBoostTypeById(id: number): Promise<BoostType | undefined> {
    const { data, error } = await supabase
      .from('boost_types')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error getting boost type by ID:', error);
      return undefined;
    }

    return data;
  }

  async createBoostType(boostTypeData: Partial<BoostType>): Promise<BoostType> {
    const { data, error } = await supabase
      .from('boost_types')
      .insert([boostTypeData])
      .select()
      .single();

    if (error) {
      console.error('Error creating boost type:', error);
      throw error;
    }

    return data;
  }

  async updateBoostType(id: number, boostTypeData: Partial<BoostType>): Promise<BoostType | undefined> {
    const { data, error } = await supabase
      .from('boost_types')
      .update(boostTypeData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating boost type:', error);
      return undefined;
    }

    return data;
  }

  async deleteBoostType(id: number): Promise<boolean> {
    const { error } = await supabase
      .from('boost_types')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting boost type:', error);
      return false;
    }

    return true;
  }

  // UserBoost methods
  async getUserBoosts(userId: number): Promise<(UserBoost & { boostType: BoostType })[]> {
    const { data, error } = await supabase
      .from('user_boosts')
      .select('*, boost_type:boost_types(*)')
      .eq('user_id', userId);

    if (error) {
      console.error('Error getting user boosts:', error);
      return [];
    }

    return data || [];
  }

  async getUserActiveBoosts(userId: number): Promise<(UserBoost & { boostType: BoostType })[]> {
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('user_boosts')
      .select('*, boost_type:boost_types(*)')
      .eq('user_id', userId)
      .eq('is_active', true)
      .gt('end_time', now);

    if (error) {
      console.error('Error getting user active boosts:', error);
      return [];
    }

    return data || [];
  }

  async createUserBoost(userBoostData: Partial<UserBoost>): Promise<UserBoost> {
    const { data, error } = await supabase
      .from('user_boosts')
      .insert([userBoostData])
      .select()
      .single();

    if (error) {
      console.error('Error creating user boost:', error);
      throw error;
    }

    return data;
  }

  async deactivateExpiredBoosts(): Promise<number> {
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('user_boosts')
      .update({ is_active: false })
      .eq('is_active', true)
      .lt('end_time', now);

    if (error) {
      console.error('Error deactivating expired boosts:', error);
      return 0;
    }

    return data?.length || 0;
  }

  // Referral methods
  async getReferrals(referrerId: number): Promise<(Referral & { referred: User })[]> {
    const { data, error } = await supabase
      .from('referrals')
      .select('*, referred:users(*)')
      .eq('referrer_id', referrerId);

    if (error) {
      console.error('Error getting referrals:', error);
      return [];
    }

    return data || [];
  }

  async createReferral(referralData: Partial<Referral>): Promise<Referral> {
    const { data, error } = await supabase
      .from('referrals')
      .insert([referralData])
      .select()
      .single();

    if (error) {
      console.error('Error creating referral:', error);
      throw error;
    }

    return data;
  }

  async getReferralCount(userId: number): Promise<number> {
    const { count, error } = await supabase
      .from('referrals')
      .select('*', { count: 'exact', head: true })
      .eq('referrer_id', userId);

    if (error) {
      console.error('Error getting referral count:', error);
      return 0;
    }

    return count || 0;
  }
} 