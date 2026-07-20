export interface Product {
  id?: string;
  name: string;
  category: string;
  price: number;
  image?: string;
  deposit?: boolean;
}

export interface HeroSlide {
  id?: string;
  title: string;
  subtitle: string;
  image: string;
  imagePosition?: string;
  order?: number;
}

export interface Deal {
  id?: string;
  title: string;
  description?: string;
  tag?: string;
  type?: string;
  tone?: string;
  validity?: string;
  condition?: string;
  note?: string;
}

export interface CatalogData {
  heroSlides: HeroSlide[];
  termekek: Product[];
  akciok: Deal[];
}

export interface EnrichedProduct extends Product {
  normalizedName: string;
  normalizedCategory: string;
  searchText: string;
  searchWords: string[];
  priceValue: number;
}
