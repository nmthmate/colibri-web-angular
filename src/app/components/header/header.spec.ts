import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Header } from './header';

describe('Header', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [Header],
      providers: [provideRouter([])],
    });
  });

  it('shows the home navigation (Kínálat, Akciók, Kapcsolat) for the "home" variant', () => {
    const fixture = TestBed.createComponent(Header);
    fixture.componentInstance.variant = 'home';
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Kínálat');
    expect(text).toContain('Akciók');
    expect(text).toContain('Kapcsolat');
    expect(text).not.toContain('Impresszum');
  });

  it('shows the legal navigation (Impresszum, Adatkezelés) for the "legal" variant', () => {
    const fixture = TestBed.createComponent(Header);
    fixture.componentInstance.variant = 'legal';
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Impresszum');
    expect(text).toContain('Adatkezelés');
    expect(text).not.toContain('Akciók');
  });
});
