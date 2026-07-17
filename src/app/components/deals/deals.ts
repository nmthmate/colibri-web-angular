import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProductsService } from '../../core/products.service';
import { RevealOnScrollDirective } from '../../core/reveal-on-scroll.directive';

const FALLBACK_TONES = ['amber', 'lime', 'mint'];

@Component({
  selector: 'app-deals',
  imports: [RouterLink, RevealOnScrollDirective],
  templateUrl: './deals.html',
})
export class Deals {
  private readonly productsService = inject(ProductsService);
  protected readonly deals = this.productsService.deals;

  protected tone(index: number, tone?: string): string {
    return tone || FALLBACK_TONES[index % FALLBACK_TONES.length];
  }
}
