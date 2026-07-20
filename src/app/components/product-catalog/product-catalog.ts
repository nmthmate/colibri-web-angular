import { Component, HostListener, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EnrichedProduct } from '../../core/product.model';
import { PriceRange, ProductsService } from '../../core/products.service';
import { getDepositAmount } from '../../core/deposit';
import { categoryIcon } from '../../core/category-icon';
import { formatPrice } from '../../core/price';
import { RevealOnScrollDirective } from '../../core/reveal-on-scroll.directive';

const SEARCH_DEBOUNCE_MS = 130;

@Component({
  selector: 'app-product-catalog',
  imports: [FormsModule, RevealOnScrollDirective],
  templateUrl: './product-catalog.html',
})
export class ProductCatalog {
  protected readonly productsService = inject(ProductsService);

  protected readonly searchInput = signal(this.productsService.search());
  protected readonly selectedProduct = signal<EnrichedProduct | null>(null);
  protected readonly modalImageSrc = signal('logo.jpeg');
  private imageCandidates: string[] = [];
  private imageCandidateIndex = 0;

  private searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      document.body.classList.toggle('lock-scroll', this.selectedProduct() !== null);
    });
  }

  protected onSearchInput(value: string): void {
    this.searchInput.set(value);
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }
    this.searchDebounceTimer = setTimeout(() => {
      this.productsService.setSearch(value);
    }, SEARCH_DEBOUNCE_MS);
  }

  protected onCategoryClick(category: string): void {
    this.productsService.setCategory(category);
  }

  protected onPriceChange(range: string): void {
    this.productsService.setPriceRange(range as PriceRange);
  }

  protected onDrsChange(checked: boolean): void {
    this.productsService.setDrsOnly(checked);
  }

  protected clearFilters(): void {
    this.searchInput.set('');
    this.productsService.clearFilters();
  }

  protected loadMore(): void {
    this.productsService.loadMore();
  }

  protected countLabel(): string {
    const visible = this.productsService.visibleProducts().length;
    const filtered = this.productsService.filteredProducts().length;
    const total = this.productsService.totalCount();
    const hasFilter = this.productsService.hasActiveFilter();
    const isLimited = filtered > visible;

    if (hasFilter || isLimited) {
      return `${visible} / ${filtered} termék`;
    }
    return `${total} termék`;
  }

  protected loadMoreLabel(): string {
    const remaining = this.productsService.remainingCount();
    const nextBatch = Math.min(50, remaining);
    return `További ${nextBatch} termék (${this.productsService.visibleCount()}/${this.productsService.filteredProducts().length})`;
  }

  protected depositAmount(product: EnrichedProduct): number | null {
    return getDepositAmount(product);
  }

  protected categoryIcon(category: string): string {
    return categoryIcon(category);
  }

  protected formatPrice(price: number): string {
    return formatPrice(price);
  }

  protected openModal(product: EnrichedProduct): void {
    this.selectedProduct.set(product);
    const rawImageSrc = String(product.image || '').trim();
    this.imageCandidates = rawImageSrc
      ? rawImageSrc.includes('/')
        ? [rawImageSrc, 'logo.jpeg']
        : [`termekek/${rawImageSrc}`, rawImageSrc, 'logo.jpeg']
      : ['logo.jpeg'];
    this.imageCandidateIndex = 0;
    this.modalImageSrc.set(this.imageCandidates[0]);
  }

  protected onModalImageError(): void {
    if (this.imageCandidateIndex >= this.imageCandidates.length - 1) {
      return;
    }
    this.imageCandidateIndex += 1;
    this.modalImageSrc.set(this.imageCandidates[this.imageCandidateIndex]);
  }

  protected closeModal(): void {
    this.selectedProduct.set(null);
  }

  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeModal();
    }
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.closeModal();
  }
}
