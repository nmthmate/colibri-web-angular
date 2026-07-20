import { TestBed } from '@angular/core/testing';
import { AgeGate } from './age-gate';

const STORAGE_KEY = 'colibri-age-confirmed';

function createMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  } as Storage;
}

describe('AgeGate', () => {
  beforeEach(() => {
    // Node's own experimental global `localStorage` (unflagged since ~v24) shadows jsdom's
    // implementation and throws without `--localstorage-file`, so stub in a real in-memory one.
    vi.stubGlobal('localStorage', createMemoryStorage());
    document.body.classList.remove('lock-scroll');
    TestBed.configureTestingModule({ imports: [AgeGate] });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.classList.remove('lock-scroll');
  });

  it('is unconfirmed and locks scroll by default', () => {
    const fixture = TestBed.createComponent(AgeGate);
    fixture.detectChanges();

    expect(fixture.componentInstance['confirmed']()).toBe(false);
    expect(document.body.classList.contains('lock-scroll')).toBe(true);
  });

  it('reads a prior confirmation from localStorage', () => {
    localStorage.setItem(STORAGE_KEY, 'true');

    const fixture = TestBed.createComponent(AgeGate);
    fixture.detectChanges();

    expect(fixture.componentInstance['confirmed']()).toBe(true);
    expect(document.body.classList.contains('lock-scroll')).toBe(false);
  });

  it('persists confirmation and unlocks scroll when the user confirms', () => {
    const fixture = TestBed.createComponent(AgeGate);
    fixture.detectChanges();

    fixture.componentInstance['confirm']();
    fixture.detectChanges();

    expect(fixture.componentInstance['confirmed']()).toBe(true);
    expect(localStorage.getItem(STORAGE_KEY)).toBe('true');
    expect(document.body.classList.contains('lock-scroll')).toBe(false);
  });

  it('marks the visitor as rejected without confirming', () => {
    const fixture = TestBed.createComponent(AgeGate);
    fixture.detectChanges();

    fixture.componentInstance['reject']();
    fixture.detectChanges();

    expect(fixture.componentInstance['rejected']()).toBe(true);
    expect(fixture.componentInstance['confirmed']()).toBe(false);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
