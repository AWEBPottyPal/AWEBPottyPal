import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

interface FlaggedRestroom {
  _id: string;
  name: string;
  description: string;
  location: any;
  amenities: string[];
  createdBy: { _id: string; username: string; email: string };
  flags: Array<{ _id: string; username: string; email: string }>;
  flagCount: number;
  isFlagged: boolean;
  createdAt: string;
}

@Component({
  selector: 'app-flagged-restrooms',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div>
      <h1>🚩 Community Flagged Restrooms</h1>
      <p>Restrooms flagged by the community as needing attention</p>

      <!-- Sorting Controls -->
      <div>
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

        <button (click)="refreshList()">🔄 Refresh</button>
      </div>

      <!-- Loading State -->
      <div *ngIf="isLoading">Loading flagged restrooms...</div>

      <!-- Error Message -->
      <div *ngIf="errorMessage">
        {{ errorMessage }}
      </div>

      <!-- No Flagged Restrooms -->
      <div *ngIf="!isLoading && filteredRestrooms.length === 0 && !errorMessage">
        ✅ No flagged restrooms - the community is taking good care of things!
      </div>

      <!-- Flagged Restrooms List -->
      <div *ngIf="!isLoading && filteredRestrooms.length > 0">
        <div *ngFor="let restroom of filteredRestrooms">
          <h3>{{ restroom.name }} - {{ restroom.flagCount }} 🚩</h3>
          <p>by {{ restroom.createdBy.username || 'Unknown' }}</p>
          
          <p>{{ restroom.description }}</p>

          <div>
            <p>
              <strong>Location:</strong>
              Lat: {{ restroom.location?.latitude | number: '1.4-4' }}, Lng: {{ restroom.location?.longitude | number: '1.4-4' }}
            </p>
            <p *ngIf="restroom.createdAt">
              <strong>Added:</strong>
              {{ restroom.createdAt | date: 'short' }}
            </p>
          </div>

          <!-- Amenities -->
          <div *ngIf="restroom.amenities && restroom.amenities.length > 0">
            <strong>Amenities:</strong>
            <ul>
              <li *ngFor="let amenity of restroom.amenities">{{ amenity }}</li>
            </ul>
          </div>

          <!-- Flaggers List -->
          <div *ngIf="restroom.flagCount > 0">
            <strong>Flagged By Community ({{ restroom.flagCount }}):</strong>
            <ul>
              <li *ngFor="let user of restroom.flags">
                {{ user.username }}
              </li>
            </ul>
          </div>

          <!-- Actions -->
          <div>
            <a [routerLink]="['/restrooms', restroom._id]">👁 View Details</a>
            @if (auth.isAdmin()) {
              <button (click)="deleteRestroom(restroom._id, restroom.name)" style="margin-left: 10px; color: red;">
                🗑️ Delete Restroom
              </button>
            }
          </div>
          <hr>
        </div>
      </div>
    </div>
  `
})
export class FlaggedRestroomsComponent implements OnInit, OnDestroy {
  private apiService = inject(ApiService);
  private authService = inject(AuthService);
  private cd = inject(ChangeDetectorRef);
  private router = inject(Router);

  auth = this.authService;

  allRestrooms: FlaggedRestroom[] = [];
  flaggedRestrooms: FlaggedRestroom[] = [];
  isLoading = false;
  errorMessage = '';
  sortBy: string = 'flags';
  sortOrder: string = 'desc';

  ngOnInit(): void {
    console.log('[FlaggedRestrooms] Component initialized');
    this.loadFlaggedRestrooms();
  }

  get filteredRestrooms(): FlaggedRestroom[] {
    return this.flaggedRestrooms.filter((r) => r.isFlagged === true);
  }

  loadFlaggedRestrooms(): void {
    console.log('[FlaggedRestrooms] Loading flagged restrooms');
    this.isLoading = true;
    this.errorMessage = '';

    // Load all restrooms and filter for flagged ones
    this.apiService.getAllRestrooms().subscribe({
      next: (restrooms: any[]) => {
        console.log('[FlaggedRestrooms] Loaded', restrooms.length, 'total restrooms');
        
        // Transform and sort
        this.allRestrooms = restrooms.map((r) => ({
          ...r,
          flagCount: r.flags?.length || 0,
        }));

        // Apply sorting
        this.applySorting();
        this.isLoading = false;
        this.cd.markForCheck();
      },
      error: (err) => {
        console.error('[FlaggedRestrooms] Error loading restrooms:', err);
        this.errorMessage = 'Failed to load flagged restrooms';
        this.isLoading = false;
        this.cd.markForCheck();
      },
    });
  }

  applySorting(): void {
    const flagged = [...this.allRestrooms].filter((r) => r.isFlagged === true);

    if (this.sortBy === 'flags') {
      flagged.sort((a, b) =>
        this.sortOrder === 'desc' ? b.flagCount - a.flagCount : a.flagCount - b.flagCount
      );
    } else if (this.sortBy === 'date') {
      flagged.sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return this.sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
      });
    }

    this.flaggedRestrooms = flagged;
  }

  sortRestrooms(): void {
    console.log('[FlaggedRestrooms] Sorting by', this.sortBy, 'order', this.sortOrder);
    this.applySorting();
    this.cd.markForCheck();
  }

  refreshList(): void {
    console.log('[FlaggedRestrooms] Refreshing list');
    this.loadFlaggedRestrooms();
  }

  deleteRestroom(restroomId: string, name: string): void {
    if (!this.authService.isAdmin()) {
      alert('Only admins can delete restrooms');
      return;
    }

    const confirmed = confirm(
      `Are you sure you want to DELETE "${name}"? This action cannot be undone.`
    );
    if (!confirmed) return;

    console.log('[FlaggedRestrooms] Deleting restroom:', restroomId);
    this.apiService.adminDeleteRestroom(restroomId).subscribe({
      next: (response) => {
        console.log('[FlaggedRestrooms] Restroom deleted:', response);
        this.flaggedRestrooms = this.flaggedRestrooms.filter((r) => r._id !== restroomId);
        this.allRestrooms = this.allRestrooms.filter((r) => r._id !== restroomId);
        alert('Restroom deleted successfully!');
        this.cd.markForCheck();
      },
      error: (err) => {
        console.error('[FlaggedRestrooms] Error deleting:', err);
        alert('Failed to delete restroom. Please try again.');
        this.cd.markForCheck();
      },
    });
  }

  ngOnDestroy(): void {
    console.log('[FlaggedRestrooms] Component destroyed');
  }
}
