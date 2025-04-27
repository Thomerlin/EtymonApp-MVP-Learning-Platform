import { Component, Input } from '@angular/core';
import { FeedbackService } from '../../services/feedback.service';

@Component({
  selector: 'app-feedback-popup',
  templateUrl: './feedback-popup.component.html',
  styleUrls: ['./feedback-popup.component.scss']
})
export class FeedbackPopupComponent {
  @Input() show: boolean = false;
  dontShowAgain: boolean = false;
  
  // Google Form URL - replace with your actual form URL
  feedbackFormUrl = 'https://docs.google.com/forms/d/e/1FAIpQLSdb2U2jOUYSldhwHlUMGuI-PyB3J2Ouqe2DzDbgPaEhpaMKLg/viewform?usp=dialog';
  
  constructor(private feedbackService: FeedbackService) {}
  
  closePopup(): void {
    this.feedbackService.closePopup(this.dontShowAgain);
  }
  
  openFeedbackForm(): void {
    window.open(this.feedbackFormUrl, '_blank');
    this.closePopup();
  }
}
