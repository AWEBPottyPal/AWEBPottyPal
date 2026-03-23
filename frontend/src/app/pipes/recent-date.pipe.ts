import { Pipe, PipeTransform } from '@angular/core';

/**
 * RecentDatePipe
 * Transforms an ISO date string into a human-friendly relative + absolute label.
 * Example: "2 hours ago • Mar 23, 2026, 9:30 PM"
 */
@Pipe({
  name: 'recentDate',
  standalone: true,
})
export class RecentDatePipe implements PipeTransform {
  transform(value?: string): string {
    if (!value) return 'Date unavailable';

    const created = new Date(value);
    if (Number.isNaN(created.getTime())) return 'Date unavailable';

    const diffMs = Date.now() - created.getTime();
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;

    let relative = '';
    if (diffMs < hour) {
      const minutes = Math.max(1, Math.floor(diffMs / minute));
      relative = `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
    } else if (diffMs < day) {
      const hours = Math.floor(diffMs / hour);
      relative = `${hours} hour${hours === 1 ? '' : 's'} ago`;
    } else {
      const days = Math.floor(diffMs / day);
      relative = `${days} day${days === 1 ? '' : 's'} ago`;
    }

    const absolute = created.toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    return `${relative} • ${absolute}`;
  }
}
