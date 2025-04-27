import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FeedbackService {
  private showPopupSubject = new BehaviorSubject<boolean>(false);
  showPopup$ = this.showPopupSubject.asObservable();
  
  private readonly POPUP_INTERVAL = 10 * 60 * 1000; // 10 minutes in milliseconds
  private readonly STORAGE_KEY = 'feedback_popup_last_shown';
  private readonly DISMISSED_KEY = 'feedback_popup_dismissed';
  
  constructor() {
    // Initialize the timer when service is created
    this.initPopupTimer();
  }
  
  private initPopupTimer(): void {
    // Check if the user has permanently dismissed the popup
    if (localStorage.getItem(this.DISMISSED_KEY) === 'true') {
      return;
    }
    
    // Check when the popup was last shown
    const lastShown = localStorage.getItem(this.STORAGE_KEY);
    const now = new Date().getTime();
    
    if (!lastShown || (now - parseInt(lastShown, 10)) > this.POPUP_INTERVAL) {
      // Wait a bit after page load before showing popup
      setTimeout(() => {
        this.showPopupSubject.next(true);
        localStorage.setItem(this.STORAGE_KEY, now.toString());
      }, 60000); // Show after 1 minute of page load
    }
    
    // Set up recurring check
    setInterval(() => {
      const currentTime = new Date().getTime();
      const lastDisplayTime = parseInt(localStorage.getItem(this.STORAGE_KEY) || '0', 10);
      
      if ((currentTime - lastDisplayTime) > this.POPUP_INTERVAL) {
        this.showPopupSubject.next(true);
        localStorage.setItem(this.STORAGE_KEY, currentTime.toString());
      }
    }, 60000); // Check every minute
  }
  
  closePopup(dontShowAgain: boolean = false): void {
    this.showPopupSubject.next(false);
    
    if (dontShowAgain) {
      localStorage.setItem(this.DISMISSED_KEY, 'true');
    }
  }
  
  resetDismissedState(): void {
    localStorage.removeItem(this.DISMISSED_KEY);
  }
}
