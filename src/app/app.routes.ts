import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { Impresszum } from './pages/impresszum/impresszum';
import { Adatkezeles } from './pages/adatkezeles/adatkezeles';

export const routes: Routes = [
  { path: '', component: Home, title: 'Colibri Italdiszkont | Dunavarsány' },
  { path: 'impresszum', component: Impresszum, title: 'Impresszum | Colibri Italdiszkont' },
  { path: 'adatkezeles', component: Adatkezeles, title: 'Adatkezelés | Colibri Italdiszkont' },
  {
    path: 'admin',
    loadChildren: () => import('./admin.routes').then((m) => m.ADMIN_ROUTES),
  },
];
