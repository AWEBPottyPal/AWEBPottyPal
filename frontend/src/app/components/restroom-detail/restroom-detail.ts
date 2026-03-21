import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { Restroom } from '../../models/restroom.model';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-restroom-detail',
  imports: [FormsModule],
  template: `
    <h2>Restroom Detail</h2>
    @if (restroom) {
      <p><strong>Name:</strong> {{ restroom.name }}</p>
      <p><strong>Description:</strong> {{ restroom.description }}</p>
      <p><strong>Location:</strong>
        Lat {{ restroom.location?.latitude }}, Lng {{ restroom.location?.longitude }}
      </p>
      <p><strong>Amenities:</strong> {{ restroom.amenities?.join(', ') || 'None' }}</p>
      <p><strong>Flagged:</strong> {{ restroom.isFlagged }}</p>

      <hr>

      @if (auth.isLoggedIn()) {
        <div style="margin:8px 0;">
          @if (isSaved) {
            <button (click)="unsave()">💾 Unsave</button>
          } @else {
            <button (click)="save()">💾 Save</button>
          }
          @if (isFlagged) {
            <button (click)="unflag()">🚩 Unflag</button>
          } @else {
            <button (click)="flag()">🚩 Flag</button>
          }
        </div>
        <p>{{ actionMsg }}</p>

        <hr>
        <h3>Add Review</h3>
        <label>Rating (1–5): <input [(ngModel)]="rating" type="number" min="1" max="5" /></label><br>
        <label>Comment: <input [(ngModel)]="comment" placeholder="Your comment" /></label><br>
        <button (click)="submitReview()">Submit Review</button>
        <p>{{ reviewMsg }}</p>
      } @else {
        <p><em>Login to save, flag, or review this restroom.</em></p>
      }

      <hr>
      <h3>Reviews</h3>
      @for (r of reviews; track $index) {
        <div style="border:1px solid #aaa; margin:4px; padding:4px;">
          <strong>{{ r.user?.username }}</strong> — ⭐ {{ r.rating }}<br>
          <span>{{ r.comment }}</span>
          @if (auth.getUserId() && ((r.user && (r.user._id === auth.getUserId())) || (r.user && (r.user === auth.getUserId())))) {
            <button (click)="deleteReview(r._id)">🗑️ Delete Review</button>
          }
        </div>
      }
      @if (reviews.length === 0) { <p>No reviews yet.</p> }
    } @else {
      <p>Loading...</p>
    }
  `
})
export class RestroomDetailComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  auth = inject(AuthService);
  private cd = inject(ChangeDetectorRef);
  private route = inject(ActivatedRoute);
  private destroy$ = new Subject<void>();

  restroom: Restroom | null = null;
  reviews: any[] = [];
  actionMsg = '';
  reviewMsg = '';
  rating = 5;
  comment = '';
  isSaved = false;
  isFlagged = false;

  ngOnInit() {
    // Subscribe to route parameter changes and fetch data whenever the route ID changes
    this.route.paramMap
      .pipe(takeUntil(this.destroy$))
      .subscribe((params) => {
        const id = params.get('id');
        if (id) {
          this.fetchData(id);
        }
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private fetchData(id: string) {
    this.api.getRestroom(id).subscribe({
      next: (r) => { console.log('[Detail] Restroom:', r); this.restroom = r; },
      error: (e) => console.error('[Detail] Error:', e)
    });
    this.api.getReviews(id).subscribe({
      next: (r) => { console.log('[Detail] Reviews:', r); this.reviews = r; },
      error: (e) => console.error('[Detail] Reviews error:', e)
    });

    // Determine if current user has saved or flagged this restroom
    const userId = this.auth.getUserId();
    if (userId) {
      this.api.getSavedRestrooms(userId).subscribe({
        next: (saved) => {
          try {
            const found = Array.isArray(saved) && saved.some((s: any) => s._id === id || s._id === this.restroom?._id);
            this.isSaved = !!found;
            this.cd.markForCheck();
            console.log('[Detail] isSaved set to', this.isSaved);
          } catch (err) {
            console.error('[Detail] Error checking saved restrooms:', err);
          }
        },
        error: (e) => console.error('[Detail] Saved restrooms error:', e)
      });

      this.api.getFlaggedRestrooms(userId).subscribe({
        next: (flagged) => {
          try {
            const found = Array.isArray(flagged) && flagged.some((f: any) => f._id === id || f._id === this.restroom?._id);
            this.isFlagged = !!found;
            this.cd.markForCheck();
            console.log('[Detail] isFlagged set to', this.isFlagged);
          } catch (err) {
            console.error('[Detail] Error checking flagged restrooms:', err);
          }
        },
        error: (e) => console.error('[Detail] Flagged restrooms error:', e)
      });
    }
  }

  save() {
    this.api.saveRestroom(this.restroom!._id).subscribe({
      next: (r) => {
        console.log('[Detail] Save:', r);
        this.actionMsg = `✅ ${r.message}`;
        this.isSaved = true;
        this.cd.markForCheck();
      },
      error: (e) => { this.actionMsg = `❌ ${e.error?.message}`; this.cd.markForCheck(); }
    });
  }

  unsave() {
    this.api.saveRestroom(this.restroom!._id).subscribe({
      next: (r) => {
        console.log('[Detail] Unsave:', r);
        this.actionMsg = `✅ ${r.message}`;
        this.isSaved = false;
        this.cd.markForCheck();
      },
      error: (e) => { this.actionMsg = `❌ ${e.error?.message}`; this.cd.markForCheck(); }
    });
  }

  flag() {
    console.log('[Detail] FLAG clicked, isFlagged:', this.isFlagged, 'restroom.isFlagged:', this.restroom?.isFlagged);
    this.api.flagRestroom(this.restroom!._id).subscribe({
      next: (r) => {
        console.log('[Detail] Flag response:', r);
        this.actionMsg = `✅ ${r.message}`;
        this.isFlagged = r.flagged === true;
        this.restroom!.isFlagged = true;
        this.cd.markForCheck();
      },
      error: (e) => {
        console.error('[Detail] Flag error:', e);
        this.actionMsg = `❌ ${e.error?.message || e.message}`; 
        this.cd.markForCheck();
      }
    });
  }

  unflag() {
    console.log('[Detail] UNFLAG clicked, isFlagged:', this.isFlagged, 'restroom.isFlagged:', this.restroom?.isFlagged);
    this.api.flagRestroom(this.restroom!._id).subscribe({
      next: (r) => {
        console.log('[Detail] Unflag response:', r);
        this.actionMsg = `✅ ${r.message}`;
        this.isFlagged = r.flagged === true;
        if (r.flagged === false) {
          this.restroom!.isFlagged = false;
        }
        this.cd.markForCheck();
      },
      error: (e) => {
        console.error('[Detail] Unflag error:', e);
        this.actionMsg = `❌ ${e.error?.message || e.message}`; 
        this.cd.markForCheck();
      }
    });
  }

  submitReview() {
    this.api.addReview(this.restroom!._id, this.rating, this.comment).subscribe({
      next: (r) => {
        console.log('[Detail] Review submitted:', r);
        this.reviewMsg = '✅ Review submitted!';
        this.reviews.push({ ...r, user: { username: this.auth.currentUser()?.username } });
      },
      error: (e) => { this.reviewMsg = `❌ ${e.error?.message}`; }
    });
  }

  deleteReview(reviewId: string) {
    if (!confirm('Delete this review?')) return;
    this.api.deleteReview(reviewId).subscribe({
      next: () => {
        console.log('[Detail] Review deleted:', reviewId);
        this.reviews = this.reviews.filter(r => r._id !== reviewId);
        this.reviewMsg = '✅ Review deleted';
        this.cd.markForCheck();
      },
      error: (e) => {
        console.error('[Detail] Delete review error:', e);
        this.reviewMsg = `❌ ${e.error?.message || e.message}`;
        this.cd.markForCheck();
      }
    });
  }
}
