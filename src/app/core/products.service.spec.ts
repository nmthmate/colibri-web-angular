import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Deal, HeroSlide, Product } from './product.model';
import { ProductsService } from './products.service';
import { firestoreCollectionUrl } from './firestore-rest';

const CATALOG_URL = firestoreCollectionUrl('catalog');
const DEALS_URL = firestoreCollectionUrl('deals');
const HERO_SLIDES_URL = firestoreCollectionUrl('heroSlides');

// Mirrors the Firestore REST API's typed-value document format closely enough for testing the
// parser in firestore-rest.ts without needing a live Firestore instance.
function toFirestoreValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return { stringValue: value };
  }
  if (typeof value === 'number') {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (typeof value === 'boolean') {
    return { booleanValue: value };
  }
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(toFirestoreValue) } };
  }
  if (value && typeof value === 'object') {
    return { mapValue: { fields: toFirestoreFields(value as Record<string, unknown>) } };
  }
  return { nullValue: null };
}

function toFirestoreFields(obj: Record<string, unknown>): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    fields[key] = toFirestoreValue(value);
  }
  return fields;
}

function toFirestoreDoc<T extends object>(obj: T): { fields: Record<string, unknown> } {
  return { fields: toFirestoreFields(obj as unknown as Record<string, unknown>) };
}

const PRODUCTS: Product[] = [
  { name: "Jack Daniel's Tennessee Whiskey 0,7 L", category: 'Röviditalok', price: 9990 },
  { name: 'Dreher Classic 0,5 L palack', category: 'Sör', price: 450 },
  { name: 'Coca Cola 0,5 L can', category: 'Üdítők', price: 600 },
  { name: 'Tokaji Aszú 0,5 L', category: 'Bor és pezsgő', price: 5500 },
  { name: 'Chio Chips 100 g', category: 'Snack', price: 990 },
];

const DEALS: Deal[] = [{ title: 'Sör akció' }];
const HERO_SLIDES: HeroSlide[] = [{ title: 'Nyári akció', subtitle: 'Hideg sörök', image: 'sor.jpg', order: 0 }];

describe('ProductsService', () => {
  let service: ProductsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ProductsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  function loadCatalog(products: Product[] = PRODUCTS, deals: Deal[] = DEALS, heroSlides: HeroSlide[] = HERO_SLIDES): void {
    service.load();
    httpMock.expectOne(CATALOG_URL).flush({ documents: [toFirestoreDoc({ products })] });
    httpMock.expectOne(DEALS_URL).flush({ documents: deals.map(toFirestoreDoc) });
    httpMock.expectOne(HERO_SLIDES_URL).flush({ documents: heroSlides.map(toFirestoreDoc) });
  }

  it('loads products, hero slides and deals from Firestore', () => {
    loadCatalog();

    expect(service.loading()).toBe(false);
    expect(service.loadError()).toBe(false);
    expect(service.totalCount()).toBe(5);
    expect(service.heroSlides().length).toBe(1);
    expect(service.deals().length).toBe(1);
  });

  it('flags a load error and stops loading on HTTP failure', () => {
    service.load();
    // Flush the other two legs first so forkJoin has nothing left to cancel once the catalog
    // request errors - flushing a request forkJoin has already cancelled throws in the harness.
    httpMock.expectOne(DEALS_URL).flush({ documents: [] });
    httpMock.expectOne(HERO_SLIDES_URL).flush({ documents: [] });
    httpMock.expectOne(CATALOG_URL).flush('boom', { status: 500, statusText: 'Server Error' });

    expect(service.loading()).toBe(false);
    expect(service.loadError()).toBe(true);
    expect(service.totalCount()).toBe(0);
  });

  it('derives the sorted, deduplicated category list', () => {
    loadCatalog();

    expect(service.categories()).toEqual(['Bor és pezsgő', 'Röviditalok', 'Snack', 'Sör', 'Üdítők']);
  });

  it('filters by exact search text across name and category', () => {
    loadCatalog();

    service.setSearch('cola');
    expect(service.filteredProducts().map((p) => p.name)).toEqual(['Coca Cola 0,5 L can']);

    service.setSearch('sör');
    expect(service.filteredProducts().map((p) => p.name)).toEqual(['Dreher Classic 0,5 L palack']);
  });

  it('tolerates a small typo via fuzzy matching on longer words', () => {
    loadCatalog();

    service.setSearch('drehr');
    expect(service.filteredProducts().map((p) => p.name)).toEqual(['Dreher Classic 0,5 L palack']);
  });

  it('filters by category', () => {
    loadCatalog();

    service.setCategory('Sör');
    expect(service.filteredProducts().map((p) => p.name)).toEqual(['Dreher Classic 0,5 L palack']);
  });

  it('filters by price range', () => {
    loadCatalog();

    service.setPriceRange('0-999');
    expect(service.filteredProducts().map((p) => p.name).sort()).toEqual(
      ['Chio Chips 100 g', 'Coca Cola 0,5 L can', 'Dreher Classic 0,5 L palack'].sort()
    );
  });

  it('filters to DRS-eligible products only', () => {
    loadCatalog();

    service.setDrsOnly(true);
    const names = service.filteredProducts().map((p) => p.name);
    expect(names).toContain('Dreher Classic 0,5 L palack');
    expect(names).toContain('Coca Cola 0,5 L can');
    expect(names).not.toContain('Chio Chips 100 g');
  });

  it('combines active filters and reports hasActiveFilter correctly', () => {
    loadCatalog();
    expect(service.hasActiveFilter()).toBe(false);

    service.setCategory('Sör');
    service.setPriceRange('0-999');
    expect(service.hasActiveFilter()).toBe(true);
    expect(service.filteredProducts().map((p) => p.name)).toEqual(['Dreher Classic 0,5 L palack']);
  });

  it('clearFilters resets search, category, price range and DRS toggle', () => {
    loadCatalog();

    service.setSearch('cola');
    service.setCategory('Üdítők');
    service.setPriceRange('0-999');
    service.setDrsOnly(true);

    service.clearFilters();

    expect(service.search()).toBe('');
    expect(service.activeCategory()).toBe('all');
    expect(service.activePriceRange()).toBe('all');
    expect(service.drsOnly()).toBe(false);
    expect(service.totalCount()).toBe(service.filteredProducts().length);
  });

  it('applyHeroFilter sets the search text and resets other filters', () => {
    loadCatalog();

    service.setCategory('Sör');
    service.setDrsOnly(true);
    service.applyHeroFilter('whiskey');

    expect(service.search()).toBe('whiskey');
    expect(service.activeCategory()).toBe('all');
    expect(service.drsOnly()).toBe(false);
    expect(service.filteredProducts().map((p) => p.name)).toEqual(["Jack Daniel's Tennessee Whiskey 0,7 L"]);
  });

  it('paginates visible products and exposes the remaining count via loadMore', () => {
    const manyProducts: Product[] = Array.from({ length: 120 }, (_, i) => ({
      name: `Termék ${i}`,
      category: 'Snack',
      price: 100,
    }));
    loadCatalog(manyProducts, [], []);

    expect(service.visibleProducts().length).toBe(50);
    expect(service.remainingCount()).toBe(70);

    service.loadMore();
    expect(service.visibleProducts().length).toBe(100);
    expect(service.remainingCount()).toBe(20);

    service.loadMore();
    expect(service.visibleProducts().length).toBe(120);
    expect(service.remainingCount()).toBe(-30);
  });
});
