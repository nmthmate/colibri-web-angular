import { Routes } from '@angular/router';
import { AdminLogin } from './pages/admin-login/admin-login';
import { AdminShell } from './pages/admin-shell/admin-shell';
import { AdminProducts } from './pages/admin-products/admin-products';
import { AdminDeals } from './pages/admin-deals/admin-deals';
import { AdminHero } from './pages/admin-hero/admin-hero';
import { adminAuthGuard, adminGuestGuard } from './core/admin-auth.guard';

export const ADMIN_ROUTES: Routes = [
  {
    path: 'login',
    component: AdminLogin,
    canActivate: [adminGuestGuard],
    title: 'Bejelentkezés | Colibri admin',
  },
  {
    path: '',
    component: AdminShell,
    canActivate: [adminAuthGuard],
    children: [
      { path: '', redirectTo: 'termekek', pathMatch: 'full' },
      { path: 'termekek', component: AdminProducts, title: 'Termékek | Colibri admin' },
      { path: 'akciok', component: AdminDeals, title: 'Akciók | Colibri admin' },
      { path: 'hero', component: AdminHero, title: 'Hero szekció | Colibri admin' },
    ],
  },
];
