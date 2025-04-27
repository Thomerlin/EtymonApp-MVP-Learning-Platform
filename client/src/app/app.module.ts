import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HomeComponent } from './components/home/home.component';
import { FormsModule } from '@angular/forms';
import { TtsService } from './services/tts.service';
import { ArticleService } from './services/article.service';
import { ExerciseService } from './services/exercise.service';
import { ProgressService } from './services/progress.service';
import { AuthService } from '@auth0/auth0-angular';
import { ArticleComponent } from './components/article/article.component';
import { AuthModalComponent } from './components/auth-modal/auth-modal.component';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async'
import { ProgressExercisesComponent } from './components/progress-exercises/progress-exercises.component';
import { ExercisesComponent } from './components/exercises/exercises.component';
import { MatTooltipModule } from '@angular/material/tooltip';
// Import the header component
import { HeaderComponent } from './components/header/header.component';
import { FooterComponent } from './components/footer/footer.component';
import { ContentInputComponent } from './components/content-input/content-input.component';
// Import the footer component
// Import the new component
import { FeedbackPopupComponent } from './components/feedback-popup/feedback-popup.component';


@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    ArticleComponent,
    AuthModalComponent,
    ProgressExercisesComponent,
    ExercisesComponent,
    HeaderComponent,
    FooterComponent,
    ContentInputComponent,
    FeedbackPopupComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    HttpClientModule,
    MatTooltipModule,
    RouterModule.forRoot([
      { path: '', component: HomeComponent },
      { path: 'article/:id', component: ArticleComponent },
      { path: '**', redirectTo: '' }
    ])
  ],
  providers: [
    ArticleService,
    ExerciseService,
    ProgressService,
    TtsService,
    AuthService,
    provideAnimationsAsync()
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
