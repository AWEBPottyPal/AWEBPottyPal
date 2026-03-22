import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

const BASE_URL = 'http://localhost:5000/api';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);

  // ─── Auth helpers ────────────────────────────────────────────────────────────
  private getToken(): string | null {
    if (typeof localStorage !== 'undefined') {
      const token = localStorage.getItem('token');
      console.log('[ApiService] getToken() returning:', token ? 'Token found' : 'No token');
      return token;
    }
    return null;
  }

  private authHeaders(): HttpHeaders {
    const token = this.getToken();
    console.log('[ApiService] Creating auth headers with token:', token ? 'Present' : 'Missing');
    if (!token) {
      console.error('[ApiService] NO TOKEN - request will fail 401');
      return new HttpHeaders();
    }
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  // ─── Users ───────────────────────────────────────────────────────────────────
  signup(data: { username: string; email: string; password: string }): Observable<any> {
    return this.http.post(`${BASE_URL}/users/signup`, data);
  }

  login(data: { email: string; password: string }): Observable<any> {
    return this.http.post(`${BASE_URL}/users/login`, data);
  }

  getProfile(id: string): Observable<any> {
    return this.http.get(`${BASE_URL}/users/profile/${id}`, { headers: this.authHeaders() });
  }

  getSavedRestrooms(id: string): Observable<any> {
    console.log('[ApiService] getSavedRestrooms() called for user id:', id);
    return this.http.get(`${BASE_URL}/users/saved-restrooms/${id}`, { headers: this.authHeaders() });
  }

  getFlaggedRestrooms(id: string): Observable<any> {
    console.log('[ApiService] getFlaggedRestrooms() called for user id:', id);
    return this.http.get(`${BASE_URL}/users/flagged-restrooms/${id}`, { headers: this.authHeaders() });
  }

  getReviewedRestrooms(id: string): Observable<any> {
    console.log('[ApiService] getReviewedRestrooms() called for user id:', id);
    return this.http.get(`${BASE_URL}/users/reviewed-restrooms/${id}`, { headers: this.authHeaders() });
  }

  // ─── Restrooms ────────────────────────────────────────────────────────────────
  getAllRestrooms(): Observable<any> {
    return this.http.get(`${BASE_URL}/restrooms`);
  }

  getRestroom(id: string): Observable<any> {
    return this.http.get(`${BASE_URL}/restrooms/${id}`);
  }

  addRestroom(data: any): Observable<any> {
    return this.http.post(`${BASE_URL}/restrooms`, data, { headers: this.authHeaders() });
  }

  updateRestroom(id: string, data: any): Observable<any> {
    return this.http.put(`${BASE_URL}/restrooms/${id}`, data, { headers: this.authHeaders() });
  }

  deleteRestroom(id: string): Observable<any> {
    return this.http.delete(`${BASE_URL}/restrooms/${id}`, { headers: this.authHeaders() });
  }

  saveRestroom(id: string): Observable<any> {
    return this.http.patch(`${BASE_URL}/restrooms/${id}/save`, {}, { headers: this.authHeaders() });
  }

  flagRestroom(id: string): Observable<any> {
    return this.http.patch(`${BASE_URL}/restrooms/${id}/flag`, {}, { headers: this.authHeaders() });
  }

  // ─── Reviews ─────────────────────────────────────────────────────────────────
  addReview(restroomId: string, rating: number, comment: string): Observable<any> {
    return this.http.post(`${BASE_URL}/reviews`, { restroomId, rating, comment }, { headers: this.authHeaders() });
  }

  getReviews(restroomId: string): Observable<any> {
    return this.http.get(`${BASE_URL}/reviews/${restroomId}`);
  }

  deleteReview(reviewId: string): Observable<any> {
    return this.http.delete(`${BASE_URL}/reviews/${reviewId}`, { headers: this.authHeaders() });
  }

  // Get restrooms added by a specific user (My Restrooms)
  getRestroomsByUser(userId: string): Observable<any> {
    return this.http.get(`${BASE_URL}/restrooms/user/${userId}`, { headers: this.authHeaders() });
  }

  // ─── Admin Routes ─────────────────────────────────────────────────────────────
  // Get all flagged restrooms (admin only)
  getAdminFlaggedRestrooms(sortBy: string = 'flags', order: string = 'desc'): Observable<any> {
    console.log('[ApiService] getAdminFlaggedRestrooms() called');
    return this.http.get(`${BASE_URL}/admin/flagged-restrooms?sortBy=${sortBy}&order=${order}`, {
      headers: this.authHeaders(),
    });
  }

  // Admin unflag a restroom (clear all flags)
  adminUnflagRestroom(id: string): Observable<any> {
    return this.http.patch(`${BASE_URL}/admin/restrooms/${id}/unflag`, {}, { headers: this.authHeaders() });
  }

  // Admin delete a restroom (bypasses ownership check)
  adminDeleteRestroom(id: string): Observable<any> {
    return this.http.delete(`${BASE_URL}/admin/restrooms/${id}`, { headers: this.authHeaders() });
  }

  // ─── Navigation ─────────────────────────────────────────────────────────────
  getDirections(
    start: { latitude: number; longitude: number }, 
    end: { latitude: number; longitude: number },
    profile: 'driving-car' | 'foot-walking' = 'driving-car'
  ): Observable<any> {
    return this.http.post(`${BASE_URL}/navigation/directions`, { start, end, profile });
  }
}
