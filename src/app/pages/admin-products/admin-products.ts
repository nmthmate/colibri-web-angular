import { HttpClient } from '@angular/common/http';
import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { CatalogData, Product } from '../../core/product.model';
import { CatalogAdminService } from '../../core/catalog-admin.service';
import { formatPrice } from '../../core/price';
import { CATEGORY_SLUGS } from '../../core/category-slug';

interface ProductFormValue {
  id?: string;
  name: string;
  category: string;
  price: number | null;
  image: string;
  deposit: boolean;
}

function emptyForm(defaultCategory: string): ProductFormValue {
  return { name: '', category: defaultCategory, price: null, image: '', deposit: false };
}

@Component({
  selector: 'app-admin-products',
  imports: [FormsModule],
  templateUrl: './admin-products.html',
})
export class AdminProducts {
  private readonly catalogAdmin = inject(CatalogAdminService);
  private readonly http = inject(HttpClient);
  private editingPreviousCategory: string | null = null;

  protected readonly importing = signal(false);
  protected readonly importMessage = signal('');

  protected readonly categories = Object.keys(CATEGORY_SLUGS);

  protected readonly products = signal<Product[]>([]);
  protected readonly loading = signal(true);
  protected readonly loadError = signal(false);

  protected readonly search = signal('');
  protected readonly activeCategory = signal('all');

  protected readonly filteredProducts = computed(() => {
    const query = this.search().trim().toLowerCase();
    const category = this.activeCategory();
    return this.products().filter((product) => {
      const matchesCategory = category === 'all' || product.category === category;
      const matchesQuery =
        !query ||
        product.name.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query);
      return matchesCategory && matchesQuery;
    });
  });

  protected readonly formOpen = signal(false);
  protected readonly formValue = signal<ProductFormValue>(emptyForm(this.categories[0]));
  protected readonly formSaving = signal(false);
  protected readonly formError = signal('');

  constructor() {
    this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(false);
    try {
      this.products.set(await this.catalogAdmin.listProducts());
    } catch {
      this.loadError.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  protected openAddForm(): void {
    this.editingPreviousCategory = null;
    this.formValue.set(emptyForm(this.categories[0]));
    this.formError.set('');
    this.formOpen.set(true);
  }

  protected openEditForm(product: Product): void {
    this.editingPreviousCategory = product.category;
    this.formValue.set({
      id: product.id,
      name: product.name,
      category: product.category,
      price: product.price,
      image: product.image || '',
      deposit: product.deposit === true,
    });
    this.formError.set('');
    this.formOpen.set(true);
  }

  protected updateForm(patch: Partial<ProductFormValue>): void {
    this.formValue.update((value) => ({ ...value, ...patch }));
  }

  protected closeForm(): void {
    this.formOpen.set(false);
  }

  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeForm();
    }
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.formOpen()) {
      this.closeForm();
    }
  }

  protected async submitForm(): Promise<void> {
    const value = this.formValue();
    if (!value.name.trim() || !value.category || !value.price || value.price <= 0) {
      this.formError.set('Add meg a nevet, a kategóriát és egy pozitív árat.');
      return;
    }

    this.formSaving.set(true);
    this.formError.set('');

    const product: Product = {
      name: value.name.trim(),
      category: value.category,
      price: value.price,
      image: value.image.trim() || undefined,
      deposit: value.deposit || undefined,
    };

    try {
      if (value.id) {
        await this.catalogAdmin.updateProduct(value.id, product, this.editingPreviousCategory ?? undefined);
      } else {
        await this.catalogAdmin.addProduct(product);
      }
      this.formOpen.set(false);
      await this.load();
    } catch {
      this.formError.set('A mentés nem sikerült, próbáld újra.');
    } finally {
      this.formSaving.set(false);
    }
  }

  protected async deleteProduct(product: Product): Promise<void> {
    if (!product.id) {
      return;
    }
    if (!confirm(`Biztosan törlöd: "${product.name}"?`)) {
      return;
    }

    try {
      await this.catalogAdmin.deleteProduct(product.id, product.category);
      await this.load();
    } catch {
      alert('A törlés nem sikerült, próbáld újra.');
    }
  }

  protected formatPrice(price: number): string {
    return formatPrice(price);
  }

  protected async importLegacyCatalog(): Promise<void> {
    const warning =
      this.products().length > 0
        ? `Már van ${this.products().length} termék az adatbázisban. Az importálás újakat ad hozzá, a meglévőket nem írja felül vagy törli - ez duplikációt okozhat. Biztosan folytatod?`
        : 'Importálod a termékeket, akciókat és hero diákat a public/kinalat.json fájlból? Ez eltarthat egy percig.';
    if (!confirm(warning)) {
      return;
    }

    this.importing.set(true);
    this.importMessage.set('Importálás folyamatban...');
    try {
      const catalog = await firstValueFrom(this.http.get<CatalogData>('kinalat.json'));
      const result = await this.catalogAdmin.importLegacyCatalog(catalog);
      this.importMessage.set(
        `Kész: ${result.productCount} termék, ${result.dealCount} akció, ${result.slideCount} hero dia importálva.`
      );
      await this.load();
    } catch {
      this.importMessage.set('Az importálás nem sikerült, próbáld újra.');
    } finally {
      this.importing.set(false);
    }
  }
}
