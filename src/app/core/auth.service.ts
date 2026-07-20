import { Injectable, signal } from '@angular/core';
import {
  Auth,
  User,
  UserCredential,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { getFirebaseApp } from './firebase-app';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly auth: Auth = getAuth(getFirebaseApp());
  private readonly readyPromise: Promise<User | null>;

  readonly user = signal<User | null>(null);
  readonly authReady = signal(false);

  constructor() {
    let resolveReady!: (user: User | null) => void;
    this.readyPromise = new Promise((resolve) => {
      resolveReady = resolve;
    });

    onAuthStateChanged(this.auth, (user) => {
      this.user.set(user);
      if (!this.authReady()) {
        this.authReady.set(true);
        resolveReady(user);
      }
    });
  }

  waitUntilReady(): Promise<User | null> {
    return this.readyPromise;
  }

  login(email: string, password: string): Promise<UserCredential> {
    return signInWithEmailAndPassword(this.auth, email, password);
  }

  logout(): Promise<void> {
    return signOut(this.auth);
  }
}
