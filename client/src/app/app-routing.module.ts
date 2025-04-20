import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { AuthCallbackComponent } from './auth/auth-callback/auth-callback.component';
import { ArticleComponent } from './components/article/article.component';
import { AuthGuard } from './guards/auth.guard';
import { ContentInputComponent } from './components/content-input/content-input.component';

// Define a resolver that checks admin status
import { inject } from '@angular/core';
import { ResolveFn, Router } from '@angular/router';
import { AdminContentService } from './services/admin-content.service';
import { map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

export const adminCheckResolver: ResolveFn<boolean> = () => {
  const adminService = inject(AdminContentService);
  const router = inject(Router);
  
  return adminService.checkAdminStatus().pipe(
    map(isAdmin => {
      if (!isAdmin) {
        router.navigate(['/']);
      }
      return isAdmin;
    }),
    catchError(() => {
      router.navigate(['/']);
      return of(false);
    })
  );
};

const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'auth-callback', component: AuthCallbackComponent },
  { path: 'article/:id', component: ArticleComponent },
  { path: 'article/:id/:nivel', component: ArticleComponent, canActivate: [AuthGuard] },
  { 
    path: 'admin/content/new', 
    component: ContentInputComponent, 
    canActivate: [AuthGuard],
    resolve: { adminCheck: adminCheckResolver }
  },

  // Protected routes
  {
    path: 'dashboard',
    loadChildren: () => import('./components/dashboard/dashboard.module').then(m => m.DashboardModule),
    canActivate: [AuthGuard]
  },

  // Wildcard route for 404
  { path: '**', redirectTo: '' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
