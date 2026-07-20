import { Component, HostListener, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Deal } from '../../core/product.model';
import { CatalogAdminService } from '../../core/catalog-admin.service';

type DealFormValue = Omit<Deal, 'id'> & { id?: string };

function emptyForm(): DealFormValue {
  return { title: '', description: '', tag: '', type: '', tone: '', validity: '', condition: '', note: '' };
}

@Component({
  selector: 'app-admin-deals',
  imports: [FormsModule],
  templateUrl: './admin-deals.html',
})
export class AdminDeals {
  private readonly catalogAdmin = inject(CatalogAdminService);

  protected readonly deals = signal<Deal[]>([]);
  protected readonly loading = signal(true);
  protected readonly loadError = signal(false);

  protected readonly formOpen = signal(false);
  protected readonly formValue = signal<DealFormValue>(emptyForm());
  protected readonly formSaving = signal(false);
  protected readonly formError = signal('');

  constructor() {
    this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(false);
    try {
      this.deals.set(await this.catalogAdmin.listDeals());
    } catch {
      this.loadError.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  protected openAddForm(): void {
    this.formValue.set(emptyForm());
    this.formError.set('');
    this.formOpen.set(true);
  }

  protected openEditForm(deal: Deal): void {
    this.formValue.set({ ...emptyForm(), ...deal });
    this.formError.set('');
    this.formOpen.set(true);
  }

  protected updateForm(patch: Partial<DealFormValue>): void {
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
    if (!value.title.trim()) {
      this.formError.set('Add meg az akció címét.');
      return;
    }

    this.formSaving.set(true);
    this.formError.set('');

    try {
      await this.catalogAdmin.saveDeal({ ...value, title: value.title.trim() });
      this.formOpen.set(false);
      await this.load();
    } catch {
      this.formError.set('A mentés nem sikerült, próbáld újra.');
    } finally {
      this.formSaving.set(false);
    }
  }

  protected async deleteDeal(deal: Deal): Promise<void> {
    if (!deal.id) {
      return;
    }
    if (!confirm(`Biztosan törlöd: "${deal.title}"?`)) {
      return;
    }
    try {
      await this.catalogAdmin.deleteDeal(deal.id);
      await this.load();
    } catch {
      alert('A törlés nem sikerült, próbáld újra.');
    }
  }
}
