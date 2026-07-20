import { Injectable } from '@angular/core';
import {
  Firestore,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  orderBy,
  query,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { CatalogData, Deal, HeroSlide, Product } from './product.model';
import { categorySlug } from './category-slug';
import { getFirebaseApp } from './firebase-app';
import { parsePriceText } from './price';

const IMPORT_BATCH_SIZE = 450;

function toFirestoreProduct(product: Product): Record<string, unknown> {
  const data: Record<string, unknown> = {
    name: product.name,
    category: product.category,
    price: product.price,
  };
  if (product.image) {
    data['image'] = product.image;
  }
  if (product.deposit) {
    data['deposit'] = true;
  }
  return data;
}

const OPTIONAL_DEAL_FIELDS: (keyof Deal)[] = [
  'description',
  'tag',
  'type',
  'tone',
  'validity',
  'condition',
  'note',
];

function toFirestoreDeal(deal: Deal): Record<string, unknown> {
  const data: Record<string, unknown> = { title: deal.title };
  for (const field of OPTIONAL_DEAL_FIELDS) {
    const value = deal[field];
    if (value) {
      data[field] = value;
    }
  }
  return data;
}

function toFirestoreHeroSlide(slide: HeroSlide): Record<string, unknown> {
  const data: Record<string, unknown> = {
    title: slide.title,
    subtitle: slide.subtitle,
    image: slide.image,
    order: slide.order ?? 0,
  };
  if (slide.imagePosition) {
    data['imagePosition'] = slide.imagePosition;
  }
  return data;
}

@Injectable({ providedIn: 'root' })
export class CatalogAdminService {
  private readonly db: Firestore = getFirestore(getFirebaseApp());

  // --- Products (source of truth for admin CRUD). The public site never reads this collection
  // directly - it reads the /catalog aggregates below via the Firestore REST API, which keeps
  // read costs flat regardless of catalog size (one doc per category instead of one per product). ---

  async listProducts(): Promise<Product[]> {
    const snapshot = await getDocs(query(collection(this.db, 'products'), orderBy('name')));
    return snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...(docSnap.data() as Omit<Product, 'id'>),
    }));
  }

  async addProduct(product: Product): Promise<void> {
    await addDoc(collection(this.db, 'products'), toFirestoreProduct(product));
    await this.syncCategoryAggregate(product.category);
  }

  async updateProduct(id: string, product: Product, previousCategory?: string): Promise<void> {
    await setDoc(doc(this.db, 'products', id), toFirestoreProduct(product));
    await this.syncCategoryAggregate(product.category);
    if (previousCategory && previousCategory !== product.category) {
      await this.syncCategoryAggregate(previousCategory);
    }
  }

  async deleteProduct(id: string, category: string): Promise<void> {
    await deleteDoc(doc(this.db, 'products', id));
    await this.syncCategoryAggregate(category);
  }

  async syncCategoryAggregate(category: string): Promise<void> {
    const snapshot = await getDocs(
      query(collection(this.db, 'products'), where('category', '==', category))
    );
    const products = snapshot.docs.map((docSnap) => toFirestoreProduct(docSnap.data() as Product));
    await setDoc(doc(this.db, 'catalog', categorySlug(category)), {
      products,
      updatedAt: Date.now(),
    });
  }

  // --- Deals & hero slides: small collections, read directly by the public site. ---

  async listDeals(): Promise<Deal[]> {
    const snapshot = await getDocs(collection(this.db, 'deals'));
    return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as Omit<Deal, 'id'>) }));
  }

  async saveDeal(deal: Deal): Promise<void> {
    const data = toFirestoreDeal(deal);
    if (deal.id) {
      await setDoc(doc(this.db, 'deals', deal.id), data);
    } else {
      await addDoc(collection(this.db, 'deals'), data);
    }
  }

  async deleteDeal(id: string): Promise<void> {
    await deleteDoc(doc(this.db, 'deals', id));
  }

  async listHeroSlides(): Promise<HeroSlide[]> {
    const snapshot = await getDocs(query(collection(this.db, 'heroSlides'), orderBy('order')));
    return snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...(docSnap.data() as Omit<HeroSlide, 'id'>),
    }));
  }

  async saveHeroSlide(slide: HeroSlide): Promise<void> {
    const data = toFirestoreHeroSlide(slide);
    if (slide.id) {
      await setDoc(doc(this.db, 'heroSlides', slide.id), data);
    } else {
      await addDoc(collection(this.db, 'heroSlides'), data);
    }
  }

  async deleteHeroSlide(id: string): Promise<void> {
    await deleteDoc(doc(this.db, 'heroSlides', id));
  }

  // --- One-time migration from the legacy public/kinalat.json snapshot. ---

  async importLegacyCatalog(
    catalog: CatalogData
  ): Promise<{ productCount: number; dealCount: number; slideCount: number }> {
    const products = catalog.termekek.map((product) => ({
      ...product,
      price: Number.isFinite(product.price) ? product.price : parsePriceText(product.price),
    }));

    for (let start = 0; start < products.length; start += IMPORT_BATCH_SIZE) {
      const batch = writeBatch(this.db);
      for (const product of products.slice(start, start + IMPORT_BATCH_SIZE)) {
        batch.set(doc(collection(this.db, 'products')), toFirestoreProduct(product));
      }
      await batch.commit();
    }

    const categories = new Set(products.map((product) => product.category));
    for (const category of categories) {
      await this.syncCategoryAggregate(category);
    }

    for (const deal of catalog.akciok) {
      await this.saveDeal(deal);
    }

    let order = 0;
    for (const slide of catalog.heroSlides) {
      await this.saveHeroSlide({ ...slide, order: slide.order ?? order });
      order += 1;
    }

    return {
      productCount: products.length,
      dealCount: catalog.akciok.length,
      slideCount: catalog.heroSlides.length,
    };
  }
}
