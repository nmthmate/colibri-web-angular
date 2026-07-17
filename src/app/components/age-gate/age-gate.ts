import { Component, effect, signal } from '@angular/core';

const AGE_GATE_STORAGE_KEY = 'colibri-age-confirmed';

@Component({
  selector: 'app-age-gate',
  templateUrl: './age-gate.html',
})
export class AgeGate {
  protected readonly confirmed = signal(this.readStoredConfirmation());
  protected readonly rejected = signal(false);

  constructor() {
    effect(() => {
      document.body.classList.toggle('lock-scroll', !this.confirmed());
    });
  }

  private readStoredConfirmation(): boolean {
    try {
      return localStorage.getItem(AGE_GATE_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  }

  protected confirm(): void {
    try {
      localStorage.setItem(AGE_GATE_STORAGE_KEY, 'true');
    } catch {
      // localStorage unavailable (e.g. private browsing) - the gate simply shows again next visit.
    }
    this.confirmed.set(true);
  }

  protected reject(): void {
    this.rejected.set(true);
  }
}
