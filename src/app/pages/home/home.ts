import { Component, OnInit, inject } from '@angular/core';
import { AgeGate } from '../../components/age-gate/age-gate';
import { Deals } from '../../components/deals/deals';
import { Hero } from '../../components/hero/hero';
import { MobileQuickbar } from '../../components/mobile-quickbar/mobile-quickbar';
import { ProductCatalog } from '../../components/product-catalog/product-catalog';
import { ProductsService } from '../../core/products.service';
import { RevealOnScrollDirective } from '../../core/reveal-on-scroll.directive';

@Component({
  selector: 'app-home',
  imports: [AgeGate, Hero, ProductCatalog, Deals, MobileQuickbar, RevealOnScrollDirective],
  templateUrl: './home.html',
})
export class Home implements OnInit {
  private readonly productsService = inject(ProductsService);

  ngOnInit(): void {
    this.productsService.load();
  }
}
