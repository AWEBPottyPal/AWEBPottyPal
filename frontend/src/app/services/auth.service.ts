import { Injectable, signal } from '@angular/core';

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
      }
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
    console.log('[AuthService] Logout called');
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    this.currentUser.set(null);
  }

  isLoggedIn(): boolean {
    const hasToken = typeof localStorage !== 'undefined' && !!localStorage.getItem('token');
    return hasToken;
  }

  getUserId(): string | null {
    const userId = this.currentUser()?._id ?? null;
    console.log('[AuthService] getUserId() called, returning:', userId);
    return userId;
  }
}
