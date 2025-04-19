import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private darkModeKey = 'darkMode';
  private darkModeSubject = new BehaviorSubject<boolean>(this.getInitialDarkModePreference());
  
  // Observable for components to subscribe to
  darkMode$ = this.darkModeSubject.asObservable();
  
  constructor() {
    // Apply stored theme on service initialization
    this.applyTheme(this.darkModeSubject.value);
    
    // Listen for system preference changes
    this.listenForSystemPreferenceChanges();
  }
  
  private getInitialDarkModePreference(): boolean {
    // Check local storage first
    const storedPreference = localStorage.getItem(this.darkModeKey);
    if (storedPreference !== null) {
      return storedPreference === 'true';
    }
    
    // If no preference is stored, check for system preference
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  
  private listenForSystemPreferenceChanges(): void {
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)')
        .addEventListener('change', event => {
          // Only update if the user hasn't explicitly set a preference
          if (localStorage.getItem(this.darkModeKey) === null) {
            this.darkModeSubject.next(event.matches);
            this.applyTheme(event.matches);
          }
        });
    }
  }
  
  private applyTheme(isDarkMode: boolean): void {
    document.body.classList.toggle('dark-mode', isDarkMode);
  }
  
  toggleDarkMode(): void {
    const newDarkMode = !this.darkModeSubject.value;
    localStorage.setItem(this.darkModeKey, newDarkMode.toString());
    this.darkModeSubject.next(newDarkMode);
    this.applyTheme(newDarkMode);
  }
  
  isDarkMode(): boolean {
    return this.darkModeSubject.value;
  }
}
