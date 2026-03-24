import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DatetimeService {
  currentPHTime = signal<string>('');
  
  constructor() {
    this.updateTime();
    // Update every minute (or second, let's do 10 seconds for efficiency since it's only showing minutes)
    setInterval(() => this.updateTime(), 10000);
  }

  private updateTime() {
    const now = new Date();
    // Convert to Manila time via toLocaleString
    const phTimeStr = now.toLocaleString("en-US", {timeZone: "Asia/Manila"});
    const phTime = new Date(phTimeStr);

    const shortDate = phTime.toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: '2-digit',
    });
    
    let hours = phTime.getHours();
    const minutes = phTime.getMinutes() < 10 ? '0' + phTime.getMinutes() : phTime.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // '0' should be '12'
    
    this.currentPHTime.set(`${shortDate} ${hours}:${minutes} ${ampm}`);
  }
}
