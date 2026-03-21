import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { RouterLink, Router, NavigationEnd } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { Restroom } from '../../models/restroom.model';
import { Subject } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';

@Component({
  selector: 'app-reviewed',
  imports: [RouterLink],
  template: `
    <h2>⭐ Reviewed Restrooms</h2>
    <p>{{ statusMsg }}</p>
    @for (r of restrooms; track r._id) {
      <div style="border:1px solid #ccc; margin:6px; padding:6px;">
        <strong>{{ r.name }}</strong><br>
        <small>{{ r.description }}</small><br>
        <a [routerLink]="['/restrooms', r._id]">View →</a>
        <button (click)="deleteReview(r._id)">🗑️ Delete Review</button>
      </div>
    }
    @if (restrooms.length === 0 && !statusMsg) { <p>No reviewed restrooms.</p> }
  `
})
export class ReviewedComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();

  restrooms: Restroom[] = [];
  statusMsg = '';

  ngOnInit() {
    // Defer initial fetch to avoid ExpressionChangedAfterItHasBeenCheckedError
    setTimeout(() => this.fetchData(), 0);

    // Refetch data whenever navigation completes to this page
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        if (this.router.url === '/reviewed') {
          this.fetchData();
        }
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private fetchData() {
    const id = this.auth.getUserId();
    console.log('[Reviewed] User ID:', id);
    if (!id) { 
      this.statusMsg = '⚠️ Not logged in.';
      console.warn('[Reviewed] No user ID found');
      this.cdr.markForCheck();
      return; 
    }
    this.statusMsg = 'Loading...';
    this.cdr.markForCheck();
    this.api.getReviewedRestrooms(id).subscribe({
      next: (data) => { 
        console.log('[Reviewed] Data received:', data);
        this.restrooms = Array.isArray(data) ? data : [];
        this.statusMsg = '';
        this.cdr.markForCheck();
        console.log('[Reviewed] Restrooms set:', this.restrooms);
      },
      error: (e) => { 
        console.error('[Reviewed] Error:', e);
        this.statusMsg = `❌ ${e.error?.message || e.message || 'Failed to load reviewed restrooms'}`;
        this.cdr.markForCheck();
      }
    });
  }

  deleteReview(restroomId: string) {
    if (!confirm('Delete your review for this restroom?')) return;
    
    // Fetch reviews for this restroom to find the user's review
    this.api.getReviews(restroomId).subscribe({
      next: (reviews) => {
        const userReview = reviews.find((r: any) => 
          r.user && (r.user._id === this.auth.getUserId() || r.user === this.auth.getUserId())
        );
        if (!userReview) {
          this.statusMsg = '⚠️ Review not found';
          this.cdr.markForCheck();
          return;
        }
        // Delete the review
        this.api.deleteReview(userReview._id).subscribe({
          next: () => {
            this.statusMsg = '✅ Review deleted';
            this.fetchData();
          },
          error: (e) => {
            console.error('[Reviewed] Delete error:', e);
            this.statusMsg = `❌ ${e.error?.message || e.message}`;
            this.cdr.markForCheck();
          }
        });
      },
      error: (e) => {
        console.error('[Reviewed] Fetch reviews error:', e);
        this.statusMsg = `❌ ${e.error?.message || e.message}`;
        this.cdr.markForCheck();
      }
    });
  }
}
