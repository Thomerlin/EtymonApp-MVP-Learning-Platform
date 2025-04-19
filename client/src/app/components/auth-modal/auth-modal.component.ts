import { Component, Input, Output, EventEmitter } from '@angular/core';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-auth-modal',
  templateUrl: './auth-modal.component.html',
  styleUrls: ['./auth-modal.component.scss']
})
export class AuthModalComponent {
  @Input() isOpen = false;
  @Output() closeModal = new EventEmitter<void>();
  
  isSubmitting = false;
  error: string | null = null;

  constructor(private authService: AuthService) {}

  loginWithGoogle(): void {
    this.isSubmitting = true;
    this.authService.initiateGoogleLogin();
  }

  close(): void {
    this.closeModal.emit();
  }
}
