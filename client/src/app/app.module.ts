import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HomeComponent } from './components/home/home.component';
// import { ArticleComponent } from './components/article/article.component';
import { FormsModule } from '@angular/forms';
import { TtsService } from './services/tts.service';
import { ArticleService } from './services/article.service';
import { ExerciseService } from './services/exercise.service';
import { ProgressService } from './services/progress.service';
import { AuthService } from '@auth0/auth0-angular';

@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
	// ArticleComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
	FormsModule,
    HttpClientModule,
    RouterModule.forRoot([
		{ path: '', component: HomeComponent },
		// { path: 'article/:id', component: ArticleComponent },
		// { path: '**', redirectTo: '' }
	  ])
  ],
  providers: [
	ArticleService,
	ExerciseService,
	ProgressService,
	TtsService, 
	AuthService,
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
