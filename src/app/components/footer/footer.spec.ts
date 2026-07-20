import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Footer } from './footer';

describe('Footer', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [Footer],
      providers: [provideRouter([])],
    });
  });

  it('shows the Google rating and home links for the "home" variant', () => {
    const fixture = TestBed.createComponent(Footer);
    fixture.componentInstance.variant = 'home';
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Google értékelés');
    expect(text).toContain('Kínálat');
  });

  it('hides the Google rating block for the "legal" variant', () => {
    const fixture = TestBed.createComponent(Footer);
    fixture.componentInstance.variant = 'legal';
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).not.toContain('Google értékelés');
    expect(text).toContain('Impresszum');
  });

  it('renders the current year in the copyright line', () => {
    const fixture = TestBed.createComponent(Footer);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain(String(new Date().getFullYear()));
  });
});
