import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { RouterLink, Router, NavigationEnd } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { Subject } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';

@Component({
  selector: 'app-reviewed',
  imports: [RouterLink],
  template: `
    <h2>⭐ Reviewed Restrooms</h2>
    <p>{{ statusMsg }}</p>
    @for (r of reviews; track r._id) {
      <div style="border:1px solid #e0e0e0; margin-bottom:12px; padding:15px; border-radius: 8px; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
        <strong style="font-size: 1.1em;">{{ r.restroom?.name || 'Unknown Restroom' }}</strong><br>
        <span style="color: #f39c12; font-weight: bold;">★ {{ r.rating }}</span><br>
        <p style="margin: 8px 0; color: #444; font-style: italic;">"{{ r.comment }}"</p>
        <div style="display: flex; gap: 10px; margin-top: 10px;">
          @if (r.restroom?._id) {
            <a [routerLink]="['/restrooms', r.restroom._id]" style="text-decoration: none; padding: 4px 8px; background: #0066cc; color: white; border-radius: 4px; font-size: 0.9em; font-weight: bold;">View Restroom →</a>
          }
          <button (click)="deleteReview(r._id)" style="padding: 4px 8px; background: #fee; border: 1px solid #fcc; color: red; border-radius: 4px; cursor: pointer; font-size: 0.9em; font-weight: bold;">🗑️ Delete Review</button>
        </div>
      </div>
    }
    @if (reviews.length === 0 && !statusMsg) { <p style="color: #666; font-style: italic;">No reviewed restrooms.</p> }
  `
})
export class ReviewedComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();

  reviews: any[] = [];
  statusMsg = '';

  ngOnInit() {
    setTimeout(() => this.fetchData(), 0);

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
    if (!id) { 
      this.statusMsg = '⚠️ Not logged in.';
      this.cdr.markForCheck();
      return; 
    }
    this.statusMsg = 'Loading...';
    this.cdr.markForCheck();
    this.api.getReviewedRestrooms(id).subscribe({
      next: (data) => { 
        this.reviews = Array.isArray(data) ? data : [];
        this.statusMsg = '';
        this.cdr.markForCheck();
      },
      error: (e) => { 
        console.error('[Reviewed] Error:', e);
        this.statusMsg = `❌ ${e.error?.message || e.message || 'Failed to load reviewed restrooms'}`;
        this.cdr.markForCheck();
      }
    });
  }

  deleteReview(reviewId: string) {
    if (!confirm('Delete your review for this restroom?')) return;
    
    this.api.deleteReview(reviewId).subscribe({
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
  }
}
