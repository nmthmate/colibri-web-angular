import { NgStyle } from '@angular/common';
import { Component, OnDestroy, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProductsService } from '../../core/products.service';

const ROTATION_INTERVAL_MS = 5500;

@Component({
  selector: 'app-hero',
  imports: [NgStyle, RouterLink],
  templateUrl: './hero.html',
})
export class Hero implements OnDestroy {
  private readonly productsService = inject(ProductsService);
  private timer: ReturnType<typeof setInterval> | null = null;
  private rotationStarted = false;

  protected readonly heroSlides = this.productsService.heroSlides;
  protected readonly activeSlide = signal(0);

  protected readonly slide = () => this.heroSlides()[this.activeSlide()];

  constructor() {
    effect(() => {
      if (this.heroSlides().length && !this.rotationStarted) {
        this.rotationStarted = true;
        this.startRotation();
      }
    });
  }

  protected heroStyle() {
    const current = this.slide();
    if (!current) {
      return {};
    }
    return {
      '--hero-image': `url("${current.image}")`,
      '--hero-position': current.imagePosition || 'center center',
    };
  }

  protected show(index: number): void {
    const slides = this.heroSlides();
    if (!slides.length) {
      return;
    }
    const normalized = (index + slides.length) % slides.length;
    this.activeSlide.set(normalized);
  }

  protected next(): void {
    this.show(this.activeSlide() + 1);
    this.restartRotation();
  }

  protected prev(): void {
    this.show(this.activeSlide() - 1);
    this.restartRotation();
  }

  protected startRotation(): void {
    this.stopRotation();
    if (this.heroSlides().length <= 1) {
      return;
    }
    this.timer = setInterval(() => this.show(this.activeSlide() + 1), ROTATION_INTERVAL_MS);
  }

  private restartRotation(): void {
    this.startRotation();
  }

  private stopRotation(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  protected openCatalogFilter(): void {
    const current = this.slide();
    const title = (current?.title || '').toLowerCase();
    let filterText = '';

    if (title.includes('sör')) {
      filterText = 'sör';
    } else if (title.includes('rövidital')) {
      filterText = 'whisky vodka gin rum pálinka tequila likőr';
    } else if (title.includes('bor') || title.includes('pezsg')) {
      filterText = 'bor pezsgő';
    }

    if (filterText) {
      this.productsService.applyHeroFilter(filterText);
    }
  }

  ngOnDestroy(): void {
    this.stopRotation();
  }
}
