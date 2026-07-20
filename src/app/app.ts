import { Component, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { Footer } from './components/footer/footer';
import { Header } from './components/header/header';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, Footer],
  templateUrl: './app.html',
})
export class App {
  protected readonly isHome = signal(true);
  protected readonly isAdmin = signal(false);

  constructor() {
    const router = inject(Router);
    router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
      this.isHome.set(router.url === '/' || router.url.startsWith('/#'));
      this.isAdmin.set(router.url.startsWith('/admin'));
    });
  }
}
