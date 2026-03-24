import { Injectable, signal } from '@angular/core';

const GUEST_USER = {
  _id: '000000000000000000000001',
  username: 'Guest',
  email: 'guest@pottypal.local',
  role: 'user',
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  currentUser = signal<any>(null);

  constructor() {
    this.initializeUser();
  }

  private initializeUser() {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('user');
      console.log('[AuthService] Initializing user from localStorage:', stored ? 'Found' : 'Not found');
      if (stored) {
        try {
          const user = JSON.parse(stored);
          console.log('[AuthService] User parsed:', user._id);
          this.currentUser.set(user);
        } catch (e) {
          console.error('[AuthService] Failed to parse stored user:', e);
        }
      } else {
        localStorage.setItem('user', JSON.stringify(GUEST_USER));
        this.currentUser.set(GUEST_USER);
      }
    } else {
      this.currentUser.set(GUEST_USER);
    }
  }

  login(user: any) {
    console.log('[AuthService] Login called with user:', user._id);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('token', user.token);
      localStorage.setItem('user', JSON.stringify(user));
      console.log('[AuthService] User stored in localStorage');
    }
    this.currentUser.set(user);
    console.log('[AuthService] currentUser signal set to:', this.currentUser()._id);
  }

  logout() {
    console.log('[AuthService] Logout ignored (guest mode)');
    this.currentUser.set(GUEST_USER);
  }

  isLoggedIn(): boolean {
    return true;
  }

  getUserId(): string | null {
    const userId = this.currentUser()?._id ?? null;
    console.log('[AuthService] getUserId() called, returning:', userId);
    return userId;
  }

  isAdmin(): boolean {
    const role = this.currentUser()?.role;
    const isAdminUser = role === 'admin';
    console.log('[AuthService] isAdmin() called, user role:', role, 'result:', isAdminUser);
    return isAdminUser;
  }
}
