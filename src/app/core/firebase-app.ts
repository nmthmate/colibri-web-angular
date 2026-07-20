import { FirebaseApp, initializeApp } from 'firebase/app';
import { environment } from '../../environments/environment';

let app: FirebaseApp | undefined;

export function getFirebaseApp(): FirebaseApp {
  if (!app) {
    app = initializeApp(environment.firebase);
  }
  return app;
}
