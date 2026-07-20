import { Component, HostListener, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HeroSlide } from '../../core/product.model';
import { CatalogAdminService } from '../../core/catalog-admin.service';

type HeroFormValue = Omit<HeroSlide, 'id' | 'order'> & { id?: string; order: number };

function emptyForm(nextOrder: number): HeroFormValue {
  return { title: '', subtitle: '', image: '', imagePosition: '', order: nextOrder };
}

@Component({
  selector: 'app-admin-hero',
  imports: [FormsModule],
  templateUrl: './admin-hero.html',
})
export class AdminHero {
  private readonly catalogAdmin = inject(CatalogAdminService);

  protected readonly slides = signal<HeroSlide[]>([]);
  protected readonly loading = signal(true);
  protected readonly loadError = signal(false);

  protected readonly formOpen = signal(false);
  protected readonly formValue = signal<HeroFormValue>(emptyForm(0));
  protected readonly formSaving = signal(false);
  protected readonly formError = signal('');

  constructor() {
    this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(false);
    try {
      this.slides.set(await this.catalogAdmin.listHeroSlides());
    } catch {
      this.loadError.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  protected openAddForm(): void {
    const nextOrder = this.slides().reduce((max, slide) => Math.max(max, slide.order ?? 0), 0) + 1;
    this.formValue.set(emptyForm(nextOrder));
    this.formError.set('');
    this.formOpen.set(true);
  }

  protected openEditForm(slide: HeroSlide): void {
    this.formValue.set({ ...emptyForm(slide.order ?? 0), ...slide });
    this.formError.set('');
    this.formOpen.set(true);
  }

  protected updateForm(patch: Partial<HeroFormValue>): void {
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
    if (!value.title.trim() || !value.subtitle.trim() || !value.image.trim()) {
      this.formError.set('Add meg a címet, az alcímet és a kép elérési útját.');
      return;
    }

    this.formSaving.set(true);
    this.formError.set('');

    try {
      await this.catalogAdmin.saveHeroSlide({
        ...value,
        title: value.title.trim(),
        subtitle: value.subtitle.trim(),
        image: value.image.trim(),
      });
      this.formOpen.set(false);
      await this.load();
    } catch {
      this.formError.set('A mentés nem sikerült, próbáld újra.');
    } finally {
      this.formSaving.set(false);
    }
  }

  protected async deleteSlide(slide: HeroSlide): Promise<void> {
    if (!slide.id) {
      return;
    }
    if (!confirm(`Biztosan törlöd: "${slide.title}"?`)) {
      return;
    }
    try {
      await this.catalogAdmin.deleteHeroSlide(slide.id);
      await this.load();
    } catch {
      alert('A törlés nem sikerült, próbáld újra.');
    }
  }
}
