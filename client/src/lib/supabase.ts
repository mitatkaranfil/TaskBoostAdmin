import type { User, Task, BoostType, UserBoost, UserTask, Referral } from '@/types';

const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? '/api' 
  : 'http://localhost:3001/api';

async function fetchApi(endpoint: string, options?: RequestInit) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'API hatası');
  }

  return response.json();
}

// User operations
export async function getUserByTelegramId(telegramId: string) {
  return fetchApi(`/users/telegram/${telegramId}`);
}

export async function createUser(user: Partial<User>) {
  return fetchApi('/users', {
    method: 'POST',
    body: JSON.stringify(user),
  });
}

// Task operations
export async function getTasks() {
  return fetchApi('/tasks');
}

export async function getUserTasks(userId: number) {
  return fetchApi(`/users/${userId}/tasks`);
}

// Boost operations
export async function getBoostTypes() {
  return fetchApi('/boosts');
}

export async function getUserBoosts(userId: number) {
  return fetchApi(`/users/${userId}/boosts`);
}

export async function createUserBoost(userBoost: Partial<UserBoost>) {
  return fetchApi('/user-boosts', {
    method: 'POST',
    body: JSON.stringify(userBoost),
  });
}

// Referral operations
export async function getReferrals(userId: number) {
  return fetchApi(`/users/${userId}/referrals`);
}

export async function createReferral(referral: Partial<Referral>) {
  return fetchApi('/referrals', {
    method: 'POST',
    body: JSON.stringify(referral),
  });
}

// Admin Task operations
export async function getAllTasks() {
  return fetchApi('/admin/tasks');
}

export async function createTask(task: Partial<Task>) {
  return fetchApi('/admin/tasks', {
    method: 'POST',
    body: JSON.stringify(task),
  });
}

export async function updateTask(id: string, task: Partial<Task>) {
  return fetchApi(`/admin/tasks/${id}`, {
    method: 'PUT',
    body: JSON.stringify(task),
  });
}

export async function deleteTask(id: string) {
  return fetchApi(`/admin/tasks/${id}`, {
    method: 'DELETE',
  });
}

// Admin Boost operations
export async function getAllBoostTypes() {
  return fetchApi('/admin/boosts');
}

export async function createBoostType(boostType: Partial<BoostType>) {
  return fetchApi('/admin/boosts', {
    method: 'POST',
    body: JSON.stringify(boostType),
  });
}

export async function updateBoostType(id: string, boostType: Partial<BoostType>) {
  return fetchApi(`/admin/boosts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(boostType),
  });
}

export async function deleteBoostType(id: string) {
  return fetchApi(`/admin/boosts/${id}`, {
    method: 'DELETE',
  });
}

// User Task operations
export async function updateUserTaskProgress(userId: string, taskId: string, progress: number) {
  return fetchApi(`/users/${userId}/tasks/${taskId}/progress`, {
    method: 'PUT',
    body: JSON.stringify({ progress }),
  });
}

// İlerleme görevleri için increment fonksiyonu
export const incrementUserTaskProgress = async (userId: string, taskId: string, amount: number = 1): Promise<UserTask | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/tasks/${taskId}/increment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ amount }),
    });
    
    if (!response.ok) {
      throw new Error(`Error incrementing task progress: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error incrementing task progress:', error);
    return null;
  }
}; 