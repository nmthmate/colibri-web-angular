import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { Deal, EnrichedProduct, HeroSlide, Product } from './product.model';
import { getDepositAmount } from './deposit';
import { parsePriceText } from './price';
import { FirestoreListResponse, firestoreCollectionUrl, parseFirestoreDocument } from './firestore-rest';

export type PriceRange = 'all' | '0-999' | '1000-2999' | '3000-4999' | '5000+';

const DEFAULT_PRODUCTS_LIMIT = 50;
const COMBINING_DIACRITICS = /[̀-ͯ]/g;

const NAME_COLLATOR = new Intl.Collator('hu', {
  sensitivity: 'base',
  ignorePunctuation: true,
  numeric: true,
});

function normalizeForSearch(text: unknown): string {
  return String(text || '')
    .normalize('NFD')
    .replace(COMBINING_DIACRITICS, '')
    .toLowerCase()
    .trim();
}

function enrichProduct(product: Product): EnrichedProduct {
  const normalizedName = normalizeForSearch(product.name);
  const normalizedCategory = normalizeForSearch(product.category);
  const searchText = `${normalizedName} ${normalizedCategory}`.trim();
  const searchWords = searchText.split(/[^a-z0-9]+/).filter((word) => word.length > 1);
  const priceValue = Number.isFinite(product.price) ? product.price : parsePriceText(product.price);

  return {
    ...product,
    normalizedName,
    normalizedCategory,
    searchText,
    searchWords,
    priceValue,
  };
}

function sortProductsByName(products: EnrichedProduct[]): EnrichedProduct[] {
  return [...products].sort((first, second) => {
    const byName = NAME_COLLATOR.compare(String(first.name || '').trim(), String(second.name || '').trim());
    if (byName !== 0) {
      return byName;
    }
    return NAME_COLLATOR.compare(String(first.category || '').trim(), String(second.category || '').trim());
  });
}

function matchesPriceRange(priceValue: number, range: PriceRange): boolean {
  switch (range) {
    case '0-999':
      return priceValue >= 0 && priceValue <= 999;
    case '1000-2999':
      return priceValue >= 1000 && priceValue <= 2999;
    case '3000-4999':
      return priceValue >= 3000 && priceValue <= 4999;
    case '5000+':
      return priceValue >= 5000;
    default:
      return true;
  }
}

function isWithinOneEdit(first: string, second: string): boolean {
  const firstLength = first.length;
  const secondLength = second.length;
  if (Math.abs(firstLength - secondLength) > 1) {
    return false;
  }

  let pointerA = 0;
  let pointerB = 0;
  let edits = 0;

  while (pointerA < firstLength && pointerB < secondLength) {
    if (first[pointerA] === second[pointerB]) {
      pointerA += 1;
      pointerB += 1;
      continue;
    }

    edits += 1;
    if (edits > 1) {
      return false;
    }

    if (firstLength > secondLength) {
      pointerA += 1;
    } else if (firstLength < secondLength) {
      pointerB += 1;
    } else {
      pointerA += 1;
      pointerB += 1;
    }
  }

  if (pointerA < firstLength || pointerB < secondLength) {
    edits += 1;
  }

  return edits <= 1;
}

function matchesSearchQuery(product: EnrichedProduct, queryParts: string[]): boolean {
  if (!queryParts.length) {
    return true;
  }

  return queryParts.every((part) => {
    if (product.searchText.includes(part)) {
      return true;
    }

    if (part.length < 4 || !product.searchWords.length) {
      return false;
    }

    return product.searchWords.some((word) => {
      if (!word || Math.abs(word.length - part.length) > 1) {
        return false;
      }
      if (word.startsWith(part) || part.startsWith(word)) {
        return true;
      }
      return isWithinOneEdit(word, part);
    });
  });
}

@Injectable({ providedIn: 'root' })
export class ProductsService {
  private readonly http = inject(HttpClient);

  private readonly allProducts = signal<EnrichedProduct[]>([]);
  readonly heroSlides = signal<HeroSlide[]>([]);
  readonly deals = signal<Deal[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal(false);

  readonly search = signal('');
  readonly activeCategory = signal('all');
  readonly activePriceRange = signal<PriceRange>('all');
  readonly drsOnly = signal(false);
  readonly visibleCount = signal(DEFAULT_PRODUCTS_LIMIT);

  readonly totalCount = computed(() => this.allProducts().length);

  readonly categories = computed(() => {
    const categories = this.allProducts()
      .map((product) => (product.category || '').trim())
      .filter((category) => category.length > 0);
    return [...new Set(categories)].sort((a, b) => a.localeCompare(b, 'hu'));
  });

  readonly hasActiveFilter = computed(() => {
    return (
      this.search().trim().length > 0 ||
      this.activeCategory() !== 'all' ||
      this.activePriceRange() !== 'all' ||
      this.drsOnly()
    );
  });

  readonly filteredProducts = computed(() => {
    const query = normalizeForSearch(this.search());
    const queryParts = query.split(/\s+/).filter((part) => part.length > 0);
    const category = this.activeCategory();
    const priceRange = this.activePriceRange();
    const drsOnly = this.drsOnly();

    return this.allProducts().filter((product) => {
      const matchesCategory = category === 'all' || product.normalizedCategory === normalizeForSearch(category);
      const matchesPrice = matchesPriceRange(product.priceValue, priceRange);
      const matchesDeposit = !drsOnly || getDepositAmount(product) !== null;
      const matchesQuery = matchesSearchQuery(product, queryParts);
      return matchesCategory && matchesPrice && matchesDeposit && matchesQuery;
    });
  });

  readonly visibleProducts = computed(() => {
    const filtered = this.filteredProducts();
    return filtered.slice(0, Math.min(this.visibleCount(), filtered.length));
  });

  readonly remainingCount = computed(() => this.filteredProducts().length - this.visibleCount());

  load(): void {
    forkJoin({
      catalog: this.http.get<FirestoreListResponse>(firestoreCollectionUrl('catalog')),
      deals: this.http.get<FirestoreListResponse>(firestoreCollectionUrl('deals')),
      heroSlides: this.http.get<FirestoreListResponse>(firestoreCollectionUrl('heroSlides')),
    }).subscribe({
      next: ({ catalog, deals, heroSlides }) => {
        const rawProducts: Product[] = [];
        for (const document of catalog.documents || []) {
          const data = parseFirestoreDocument(document) as { products?: Product[] };
          if (Array.isArray(data.products)) {
            rawProducts.push(...data.products);
          }
        }

        const rawHeroSlides = (heroSlides.documents || [])
          .map((document) => parseFirestoreDocument(document) as unknown as HeroSlide)
          .sort((first, second) => (first.order ?? 0) - (second.order ?? 0));
        const rawDeals = (deals.documents || []).map(
          (document) => parseFirestoreDocument(document) as unknown as Deal
        );

        this.heroSlides.set(rawHeroSlides);
        this.deals.set(rawDeals);
        this.allProducts.set(sortProductsByName(rawProducts.map(enrichProduct)));
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set(true);
        this.loading.set(false);
      },
    });
  }

  setSearch(value: string): void {
    this.search.set(value);
    this.visibleCount.set(DEFAULT_PRODUCTS_LIMIT);
  }

  setCategory(category: string): void {
    this.activeCategory.set(category);
    this.visibleCount.set(DEFAULT_PRODUCTS_LIMIT);
  }

  setPriceRange(range: PriceRange): void {
    this.activePriceRange.set(range);
    this.visibleCount.set(DEFAULT_PRODUCTS_LIMIT);
  }

  setDrsOnly(value: boolean): void {
    this.drsOnly.set(value);
    this.visibleCount.set(DEFAULT_PRODUCTS_LIMIT);
  }

  loadMore(): void {
    this.visibleCount.update((count) => count + DEFAULT_PRODUCTS_LIMIT);
  }

  clearFilters(): void {
    this.search.set('');
    this.activeCategory.set('all');
    this.activePriceRange.set('all');
    this.drsOnly.set(false);
    this.visibleCount.set(DEFAULT_PRODUCTS_LIMIT);
  }

  applyHeroFilter(filterText: string): void {
    if (!filterText) {
      return;
    }
    this.search.set(filterText);
    this.activeCategory.set('all');
    this.activePriceRange.set('all');
    this.drsOnly.set(false);
    this.visibleCount.set(DEFAULT_PRODUCTS_LIMIT);
  }
}
