import { Component, OnInit } from '@angular/core';
import { FeedbackService } from './services/feedback.service';

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'Etymon';
  showFeedbackPopup = false;
  isMobile = false;

  constructor(private feedbackService: FeedbackService) {
    // Subscribe to feedback popup state
    this.feedbackService.showPopup$.subscribe(show => {
      this.showFeedbackPopup = show;
    });
  }

  ngOnInit() {
    this.checkScreenSize();
    window.addEventListener('resize', () => this.checkScreenSize());
    
    // Initialize ads after view is ready
    setTimeout(() => {
      this.initializeAds();
    }, 100);
  }

  checkScreenSize() {
    this.isMobile = window.innerWidth <= 1200;
  }
  
  initializeAds() {
    // Only load desktop ads on desktop
    const adElements = document.querySelectorAll('.adsbygoogle');
    
    adElements.forEach(ad => {
      const isDesktopAd = ad.parentElement?.classList.contains('left-ad') || 
                          ad.parentElement?.classList.contains('right-ad');
      
      // Skip loading desktop ads on mobile
      if (this.isMobile && isDesktopAd) {
        return;
      }
      
      // Skip loading mobile ads on desktop
      if (!this.isMobile && ad.parentElement?.classList.contains('bottom-ad')) {
        return;
      }
      
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (e) {
        console.error('Ad loading failed:', e);
      }
    });
  }

  toggleFeedbackPopup() {
    this.showFeedbackPopup = !this.showFeedbackPopup;
  }
}
