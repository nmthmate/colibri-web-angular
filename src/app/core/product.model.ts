export interface Product {
  name: string;
  category: string;
  price: string;
  image?: string;
  deposit?: boolean;
}

export interface HeroSlide {
  title: string;
  subtitle: string;
  image: string;
  imagePosition?: string;
}

export interface Deal {
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
