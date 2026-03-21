import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-admin-flagged',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="admin-container">
      <h1>🚨 Flagged Restrooms Moderation</h1>

      <!-- Sorting Controls -->
      <div class="controls">
        <label>Sort By:</label>
        <select [(ngModel)]="sortBy" (change)="sortRestrooms()">
          <option value="flags">Most Flagged</option>
          <option value="date">Most Recent</option>
        </select>

        <label>Order:</label>
        <select [(ngModel)]="sortOrder" (change)="sortRestrooms()">
          <option value="desc">Descending</option>
          <option value="asc">Ascending</option>
        </select>

        <button (click)="refreshList()" class="btn-refresh">🔄 Refresh</button>
      </div>

      <!-- Loading State -->
      <div *ngIf="isLoading" class="loading">Loading flagged restrooms...</div>

      <!-- Error Message -->
      <div *ngIf="errorMessage" class="error-message">
        {{ errorMessage }}
      </div>

      <!-- No Flagged Restrooms -->
      <div *ngIf="!isLoading && flaggedRestrooms.length === 0 && !errorMessage" class="no-data">
        ✅ No flagged restrooms at this time!
      </div>

      <!-- Flagged Restrooms List -->
      <div *ngIf="!isLoading && flaggedRestrooms.length > 0" class="restrooms-list">
        <div *ngFor="let restroom of flaggedRestrooms" class="restroom-card">
          <!-- Header -->
          <div class="card-header">
            <h3>{{ restroom.name }}</h3>
            <span class="flag-count">{{ restroom.flagCount }} 🚩</span>
          </div>

          <!-- Details -->
          <div class="card-body">
            <p class="description">{{ restroom.description }}</p>

            <div class="meta-info">
              <p>
                <strong>Created by:</strong>
                {{ restroom.createdBy?.username || 'Unknown' }}
              </p>
              <p>
                <strong>Location:</strong>
                Lat: {{ restroom.location?.coordinates[1] | number: '1.4-4' }}, Lng:
                {{ restroom.location?.coordinates[0] | number: '1.4-4' }}
              </p>
              <p *ngIf="restroom.createdAt">
                <strong>Added:</strong>
                {{ restroom.createdAt | date: 'short' }}
              </p>
            </div>

            <!-- Flaggers List -->
            <div class="flaggers-section" *ngIf="restroom.flagCount > 0">
              <strong>Flagged By ({{ restroom.flagCount }}):</strong>
              <ul class="flaggers-list">
                <li *ngFor="let user of restroom.flaggedUsers" class="flagger-item">
                  {{ user.username }} ({{ user.email }})
                </li>
              </ul>
            </div>

            <!-- Amenities -->
            <div class="amenities" *ngIf="restroom.amenities && restroom.amenities.length > 0">
              <strong>Amenities:</strong>
              <div class="amenity-chips">
                <span *ngFor="let amenity of restroom.amenities" class="chip">
                  {{ amenity }}
                </span>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="card-actions">
            <button class="btn-unflag" (click)="unfllagRestroom(restroom._id)">
              ✓ Clear Flags
            </button>
            <button class="btn-delete" (click)="deleteRestroom(restroom._id, restroom.name)">
              ✕ Delete Restroom
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .admin-container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 20px;
        background: #f5f5f5;
        min-height: 100vh;
      }

      h1 {
        color: #d9534f;
        margin-bottom: 20px;
        text-align: center;
      }

      /* Controls */
      .controls {
        display: flex;
        gap: 10px;
        margin-bottom: 20px;
        background: white;
        padding: 15px;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }

      .controls label {
        font-weight: bold;
        margin-right: 5px;
      }

      .controls select {
        padding: 8px 10px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 14px;
        background: white;
        cursor: pointer;
      }

      .btn-refresh {
        margin-left: auto;
        padding: 8px 15px;
        background: #5cb85c;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-weight: bold;
      }

      .btn-refresh:hover {
        background: #4cae4c;
      }

      /* States */
      .loading,
      .no-data {
        text-align: center;
        padding: 40px;
        background: white;
        border-radius: 8px;
        color: #666;
        font-size: 16px;
      }

      .error-message {
        background: #f8d7da;
        color: #721c24;
        padding: 15px;
        border-radius: 4px;
        margin-bottom: 20px;
        border: 1px solid #f5c6cb;
      }

      /* Restrooms List */
      .restrooms-list {
        display: grid;
        gap: 20px;
      }

      .restroom-card {
        background: white;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        overflow: hidden;
        border-left: 5px solid #d9534f;
      }

      .card-header {
        background: #f8f9fa;
        padding: 15px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid #dee2e6;
      }

      .card-header h3 {
        margin: 0;
        color: #333;
        font-size: 18px;
      }

      .flag-count {
        background: #d9534f;
        color: white;
        padding: 5px 10px;
        border-radius: 20px;
        font-weight: bold;
        font-size: 14px;
      }

      .card-body {
        padding: 20px;
      }

      .description {
        color: #666;
        margin: 0 0 15px 0;
        line-height: 1.5;
      }

      .meta-info p {
        margin: 8px 0;
        font-size: 14px;
        color: #555;
      }

      /* Flaggers */
      .flaggers-section {
        margin: 15px 0;
        padding: 10px;
        background: #fff3cd;
        border-left: 4px solid #ffc107;
        border-radius: 4px;
      }

      .flaggers-list {
        list-style: none;
        padding: 0;
        margin: 10px 0 0 0;
      }

      .flagger-item {
        padding: 5px 0;
        font-size: 13px;
        color: #666;
        border-bottom: 1px solid #ffeaa7;
      }

      .flagger-item:last-child {
        border-bottom: none;
      }

      /* Amenities */
      .amenities {
        margin: 15px 0;
      }

      .amenities strong {
        display: block;
        margin-bottom: 8px;
      }

      .amenity-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 5px;
      }

      .chip {
        background: #e3f2fd;
        color: #1976d2;
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 12px;
      }

      /* Actions */
      .card-actions {
        display: flex;
        gap: 10px;
        padding: 15px;
        background: #f8f9fa;
        border-top: 1px solid #dee2e6;
      }

      .btn-unflag,
      .btn-delete {
        flex: 1;
        padding: 10px 15px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-weight: bold;
        font-size: 14px;
        transition: background 0.3s, transform 0.2s;
      }

      .btn-unflag {
        background: #5cb85c;
        color: white;
      }

      .btn-unflag:hover {
        background: #4cae4c;
        transform: translateY(-2px);
      }

      .btn-delete {
        background: #d9534f;
        color: white;
      }

      .btn-delete:hover {
        background: #c9302c;
        transform: translateY(-2px);
      }

      .btn-unflag:disabled,
      .btn-delete:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    `,
  ],
})
export class AdminFlaggedComponent implements OnInit, OnDestroy {
  private apiService = inject(ApiService);
  private authService = inject(AuthService);
  private router = inject(Router);

  flaggedRestrooms: any[] = [];
  isLoading = true;
  errorMessage = '';
  sortBy: string = 'flags';
  sortOrder: string = 'desc';

  ngOnInit(): void {
    console.log('[AdminFlagged] Component initialized');
    this.checkAdminAccess();
    this.loadFlaggedRestrooms();
  }

  // Check if user is admin (can add more sophisticated role check later)
  checkAdminAccess(): void {
    console.log('[AdminFlagged] Checking admin access');
    const userId = this.authService.getUserId();
    if (!userId) {
      console.warn('[AdminFlagged] No user ID found, redirecting to home');
      this.router.navigate(['/']);
    }
  }

  loadFlaggedRestrooms(): void {
    console.log('[AdminFlagged] Loading flagged restrooms');
    this.isLoading = true;
    this.errorMessage = '';

    this.apiService.getAdminFlaggedRestrooms(this.sortBy, this.sortOrder).subscribe({
      next: (restrooms) => {
        console.log('[AdminFlagged] Loaded', restrooms.length, 'flagged restrooms');
        this.flaggedRestrooms = restrooms;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('[AdminFlagged] Error loading restrooms:', err);
        this.errorMessage =
          err.status === 403
            ? 'Access denied: Admin only'
            : 'Failed to load flagged restrooms';
        this.isLoading = false;
      },
    });
  }

  sortRestrooms(): void {
    console.log('[AdminFlagged] Sorting by', this.sortBy, 'order', this.sortOrder);
    this.loadFlaggedRestrooms();
  }

  unfllagRestroom(restroomId: string): void {
    const confirmed = confirm(
      'Clear all flags from this restroom? It will no longer appear in the moderation queue.'
    );
    if (!confirmed) return;

    console.log('[AdminFlagged] Unflagging restroom:', restroomId);
    this.apiService.adminUnflagRestroom(restroomId).subscribe({
      next: (response) => {
        console.log('[AdminFlagged] Restroom unflagged:', response);
        this.flaggedRestrooms = this.flaggedRestrooms.filter((r) => r._id !== restroomId);
        alert('Restroom flags cleared successfully!');
      },
      error: (err) => {
        console.error('[AdminFlagged] Error unflagging:', err);
        alert('Failed to clear flags. Please try again.');
      },
    });
  }

  deleteRestroom(restroomId: string, name: string): void {
    const confirmed = confirm(
      `Are you sure you want to DELETE "${name}"? This action cannot be undone.`
    );
    if (!confirmed) return;

    console.log('[AdminFlagged] Deleting restroom:', restroomId);
    this.apiService.adminDeleteRestroom(restroomId).subscribe({
      next: (response) => {
        console.log('[AdminFlagged] Restroom deleted:', response);
        this.flaggedRestrooms = this.flaggedRestrooms.filter((r) => r._id !== restroomId);
        alert('Restroom deleted successfully!');
      },
      error: (err) => {
        console.error('[AdminFlagged] Error deleting:', err);
        alert('Failed to delete restroom. Please try again.');
      },
    });
  }

  refreshList(): void {
    console.log('[AdminFlagged] Refreshing list');
    this.loadFlaggedRestrooms();
  }

  ngOnDestroy(): void {
    console.log('[AdminFlagged] Component destroyed');
  }
}
