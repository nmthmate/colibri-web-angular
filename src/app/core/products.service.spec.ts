import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CatalogData } from './product.model';
import { ProductsService } from './products.service';

const CATALOG: CatalogData = {
  heroSlides: [{ title: 'Nyári akció', subtitle: 'Hideg sörök', image: 'sor.jpg' }],
  akciok: [{ title: 'Sör akció' }],
  termekek: [
    { name: "Jack Daniel's Tennessee Whiskey 0,7 L", category: 'Röviditalok', price: '9 990 Ft' },
    { name: 'Dreher Classic 0,5 L palack', category: 'Sör', price: '450 Ft' },
    { name: 'Coca Cola 0,5 L can', category: 'Üdítők', price: '600 Ft' },
    { name: 'Tokaji Aszú 0,5 L', category: 'Bor és pezsgő', price: '5 500 Ft' },
    { name: 'Chio Chips 100 g', category: 'Snack', price: '990 Ft' },
  ],
};

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

  function loadCatalog(): void {
    service.load();
    httpMock.expectOne('kinalat.json').flush(CATALOG);
  }

  it('loads products, hero slides and deals from kinalat.json', () => {
    loadCatalog();

    expect(service.loading()).toBe(false);
    expect(service.loadError()).toBe(false);
    expect(service.totalCount()).toBe(5);
    expect(service.heroSlides().length).toBe(1);
    expect(service.deals().length).toBe(1);
  });

  it('flags a load error and stops loading on HTTP failure', () => {
    service.load();
    httpMock.expectOne('kinalat.json').flush('boom', { status: 500, statusText: 'Server Error' });

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
    const manyProducts = Array.from({ length: 120 }, (_, i) => ({
      name: `Termék ${i}`,
      category: 'Snack',
      price: '100 Ft',
    }));
    service.load();
    httpMock.expectOne('kinalat.json').flush({ heroSlides: [], akciok: [], termekek: manyProducts });

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
