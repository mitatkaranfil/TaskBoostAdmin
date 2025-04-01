// Telegram Mini App SDK wrapper
import { getUserByTelegramId, createUser } from './supabase';
import { nanoid } from 'nanoid';
import { User } from '@/types';

// Define WebApp interface based on Telegram documentation
declare global {
  interface Window {
    Telegram: {
      WebApp: {
        ready(): void;
        initData: string;
        initDataUnsafe: {
          query_id?: string;
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
            language_code?: string;
            photo_url?: string;
          };
          auth_date: number;
          hash: string;
        };
        sendData(data: string): void;
        expand(): void;
        close(): void;
        MainButton: {
          text: string;
          color: string;
          textColor: string;
          isVisible: boolean;
          isActive: boolean;
          isProgressVisible: boolean;
          show(): void;
          hide(): void;
          enable(): void;
          disable(): void;
          showProgress(leaveActive: boolean): void;
          hideProgress(): void;
          onClick(callback: () => void): void;
          offClick(callback: () => void): void;
          setText(text: string): void;
          setParams(params: {
            text?: string;
            color?: string;
            text_color?: string;
            is_active?: boolean;
            is_visible?: boolean;
          }): void;
        };
        BackButton: {
          isVisible: boolean;
          show(): void;
          hide(): void;
          onClick(callback: () => void): void;
          offClick(callback: () => void): void;
        };
        openLink(url: string): void;
        openTelegramLink(url: string): void;
        openInvoice(url: string, callback?: (status: string) => void): void;
        showPopup(params: {
          title?: string;
          message: string;
          buttons?: Array<{
            id: string;
            type?: "default" | "ok" | "close" | "cancel" | "destructive";
            text: string;
          }>;
        }, callback?: (buttonId: string) => void): void;
        showAlert(message: string, callback?: () => void): void;
        showConfirm(message: string, callback?: (isConfirmed: boolean) => void): void;
        HapticFeedback: {
          impactOccurred(style: "light" | "medium" | "heavy" | "rigid" | "soft"): void;
          notificationOccurred(type: "error" | "success" | "warning"): void;
          selectionChanged(): void;
        };
        isVersionAtLeast(version: string): boolean;
        setHeaderColor(color: string): void;
        setBackgroundColor(color: string): void;
        enableClosingConfirmation(): void;
        disableClosingConfirmation(): void;
        onEvent(eventType: string, eventHandler: Function): void;
        offEvent(eventType: string, eventHandler: Function): void;
        setViewportHeight(height: number): void;
        requestViewport(): void;
        requestWriteAccess(callback?: (access_granted: boolean) => void): void;
        requestContact(callback?: (shared_contact: boolean) => void): void;
        CloudStorage: {
          getItem(key: string, callback?: (error: Error | null, value: string | null) => void): Promise<string | null>;
          setItem(key: string, value: string, callback?: (error: Error | null, success: boolean) => void): Promise<boolean>;
          removeItem(key: string, callback?: (error: Error | null, success: boolean) => void): Promise<boolean>;
          getItems(keys: string[], callback?: (error: Error | null, values: { [key: string]: string | null }) => void): Promise<{ [key: string]: string | null }>;
          removeItems(keys: string[], callback?: (error: Error | null, success: boolean) => void): Promise<boolean>;
          getKeys(callback?: (error: Error | null, keys: string[]) => void): Promise<string[]>;
        };
      };
    };
  }
}

// Check if we are in a Telegram WebApp environment
export function isTelegramWebApp(): boolean {
  try {
    // Safer check with detailed logging
    const hasTelegramObject = typeof window !== 'undefined' && !!window.Telegram;
    const hasWebAppObject = hasTelegramObject && !!window.Telegram.WebApp;
    
    console.log('isTelegramWebApp check - window.Telegram exists:', hasTelegramObject);
    console.log('isTelegramWebApp check - window.Telegram.WebApp exists:', hasWebAppObject);
    
    // Determine if we're in development or production
    const isDevelopment = import.meta.env.DEV;
    
    if (isDevelopment) {
      // In development, we'll allow the app to work outside Telegram
      return true;
    }
    
    // In production, only return true if actually in Telegram WebApp
    return hasWebAppObject;
  } catch (error) {
    console.warn('Error checking Telegram WebApp:', error);
    // Return true for development, false for production
    return import.meta.env.DEV ? true : false;
  }
}

// Initialize and setup the Telegram Mini App
export function initializeTelegramApp(): void {
  console.log('Initializing Telegram WebApp');
  try {
    if (isTelegramWebApp()) {
      console.log('Running in Telegram WebApp environment');
      
      // Check if we're actually in Telegram environment
      if (window.Telegram?.WebApp) {
        // Inform Telegram that our app is ready
        try {
          window.Telegram.WebApp.ready();
          console.log('WebApp.ready() called');
        } catch (readyError) {
          console.warn('Error calling WebApp.ready():', readyError);
        }
        
        // Set dark theme colors for app
        try {
          window.Telegram.WebApp.setHeaderColor('#121212');
          window.Telegram.WebApp.setBackgroundColor('#121212');
          console.log('Theme colors set');
        } catch (colorError) {
          console.warn('Error setting theme colors:', colorError);
        }
        
        // Expand to take full screen if needed
        try {
          window.Telegram.WebApp.expand();
          console.log('WebApp.expand() called');
        } catch (expandError) {
          console.warn('Error calling WebApp.expand():', expandError);
        }
      } else {
        console.log('Development mode: Skipping actual Telegram API calls');
      }
    } else {
      console.warn('Not running inside Telegram WebApp');
    }
  } catch (error) {
    console.error('Error initializing Telegram WebApp:', error);
  }
}

// Get current Telegram user
export function getTelegramUser(): {
  telegramId: string;
  firstName: string;
  lastName?: string;
  username?: string;
  photoUrl?: string;
} | null {
  try {
    console.log('Checking Telegram environment...');
    console.log('isTelegramWebApp():', isTelegramWebApp());
    console.log('window.Telegram exists:', !!window.Telegram);
    console.log('window.Telegram?.WebApp exists:', !!window.Telegram?.WebApp);
    console.log('initDataUnsafe exists:', !!window.Telegram?.WebApp?.initDataUnsafe);
    console.log('user exists:', !!window.Telegram?.WebApp?.initDataUnsafe?.user);
    
    // Her zaman test kullanıcısını döndür
    console.log('Using test user data for development');
    return {
      telegramId: "123456789",
      firstName: "Test",
      lastName: "User",
      username: "testuser",
      photoUrl: "https://via.placeholder.com/100"
    };
    
    // Production environment - get actual user data - Bu kısım devre dışı bırakıldı
    /*
    const user = window.Telegram?.WebApp?.initDataUnsafe?.user;
    if (!user) return null;
    
    return {
      telegramId: user.id.toString(),
      firstName: user.first_name,
      lastName: user.last_name,
      username: user.username,
      photoUrl: user.photo_url
    };
    */
  } catch (error) {
    console.error('Error getting Telegram user:', error);
    return null;
  }
}

// Authenticate user with Telegram
export async function authenticateTelegramUser(referralCode?: string): Promise<User | null> {
  try {
    console.log('Starting authenticateTelegramUser function');
    const telegramUser = getTelegramUser();
    console.log('getTelegramUser returned:', telegramUser);
    
    if (!telegramUser) {
      throw new Error('No Telegram user found');
    }
    
    // Admin sayfası için özel durum kontrolü
    const isAdminPage = window.location.pathname.includes('/admin');
    
    if (isAdminPage) {
      console.log('Admin sayfası için özel kimlik doğrulama');
      return {
        id: 1, // Sabit bir ID kullan
        telegramId: telegramUser.telegramId,
        firstName: telegramUser.firstName,
        lastName: telegramUser.lastName || '',
        username: telegramUser.username || '',
        photoUrl: telegramUser.photoUrl || '',
        referralCode: 'ADMIN123',
        points: 1000,
        level: 10,
        miningSpeed: 100,
        lastMiningTime: new Date(),
        joinDate: new Date(),
        completedTasksCount: 0,
        boostUsageCount: 0,
        referralCount: 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      } as unknown as User;
    }
    
    // Normal kullanıcılar için mevcut kontroller
    try {
      const existingUser = await getUserByTelegramId(telegramUser.telegramId);
      if (existingUser) {
        return existingUser;
      }
    } catch (error) {
      console.log('Error getting user from Supabase:', error);
    }
    
    // Create new user if not found
    const newUser = {
      telegramId: telegramUser.telegramId,
      firstName: telegramUser.firstName,
      lastName: telegramUser.lastName || '',
      username: telegramUser.username || '',
      photoUrl: telegramUser.photoUrl || '',
      referralCode: nanoid(8),
      points: 0,
      level: 1,
      miningSpeed: 10,
      lastMiningTime: new Date(),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      completedTasksCount: 0,
      boostUsageCount: 0
    };
    
    const createdUser = await createUser(newUser);
    return createdUser;
    
  } catch (error) {
    console.error('Error in authenticateTelegramUser:', error);
    return null;
  }
}

// Show an alert using Telegram's native UI
export function showAlert(message: string): Promise<void> {
  return new Promise((resolve) => {
    if (isTelegramWebApp()) {
      window.Telegram.WebApp.showAlert(message, () => {
        resolve();
      });
    } else {
      alert(message);
      resolve();
    }
  });
}

// Show a confirmation dialog using Telegram's native UI
export function showConfirm(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (isTelegramWebApp()) {
      window.Telegram.WebApp.showConfirm(message, (isConfirmed) => {
        resolve(isConfirmed);
      });
    } else {
      const result = confirm(message);
      resolve(result);
    }
  });
}

// Open a Telegram channel or group
export function openTelegramLink(link: string): void {
  try {
    console.log('Opening Telegram link:', link);
    
    // Make sure the link is properly formatted
    if (!link.startsWith('https://t.me/')) {
      // Handle links that start with @
      if (link.startsWith('@')) {
        link = 'https://t.me/' + link.substring(1);
      } else {
        link = 'https://t.me/' + link;
      }
    }
    
    console.log('Formatted link:', link);
    
    if (isTelegramWebApp() && window.Telegram?.WebApp) {
      window.Telegram.WebApp.openLink(link);
    } else {
      window.open(link, '_blank');
    }
  } catch (error) {
    console.error('Error opening Telegram link:', error);
    
    // Fallback
    try {
      window.open(link, '_blank');
    } catch (fallbackError) {
      console.error('Fallback error:', fallbackError);
    }
  }
}

// Handle payment using Telegram's payment API
export function openInvoice(url: string): Promise<string> {
  return new Promise((resolve) => {
    if (isTelegramWebApp()) {
      window.Telegram.WebApp.openInvoice(url, (status) => {
        resolve(status);
      });
    } else {
      console.warn('Telegram payment not available outside WebApp');
      resolve('failed');
    }
  });
}

// Share data with Telegram (like referral code)
export function shareWithTelegram(data: string): void {
  if (isTelegramWebApp()) {
    try {
      if (typeof data === 'string') {
        // Check if the data appears to be a message (not a JSON object)
        const isMessage = data.includes(' ') || (!data.startsWith('{') && !data.startsWith('['));
        
        if (isMessage) {
          // It's a message, use openLink to open the share dialog
          console.log('Sharing message using Telegram share dialog');
          const encodedText = encodeURIComponent(data);
          const shareUrl = `https://t.me/share/url?url=&text=${encodedText}`;
          window.Telegram.WebApp.openLink(shareUrl);
        } else {
          // It's likely a JSON object, use sendData
          console.log('Sending data to Telegram Bot');
          window.Telegram.WebApp.sendData(data);
        }
      } else {
        // Fallback to sendData for any other case
        console.log('Sending data to Telegram Bot (fallback)');
        window.Telegram.WebApp.sendData(data);
      }
    } catch (error) {
      console.error('Error sharing with Telegram:', error);
    }
  } else {
    console.warn('Sharing not available outside WebApp');
  }
}

// Request a contact from user
export function requestContact(): Promise<boolean> {
  return new Promise((resolve) => {
    if (isTelegramWebApp()) {
      window.Telegram.WebApp.requestContact((shared) => {
        resolve(shared);
      });
    } else {
      console.warn('Contact request not available outside WebApp');
      resolve(false);
    }
  });
}

// Provide haptic feedback
export function hapticFeedback(type: 'success' | 'error' | 'warning'): void {
  if (isTelegramWebApp()) {
    window.Telegram.WebApp.HapticFeedback.notificationOccurred(type);
  }
}

// Close the WebApp
export function closeWebApp(): void {
  if (isTelegramWebApp()) {
    window.Telegram.WebApp.close();
  }
}
