import { environment } from '../../environments/environment';

// Reads public Firestore data via the plain REST API instead of the Firestore SDK, so the public
// site's bundle stays free of Firebase code. Works because /catalog, /deals and /heroSlides all
// grant `allow read: if true` in firestore.rules - the same rule the SDK would be checked against.

interface FirestoreValue {
  stringValue?: string;
  integerValue?: string;
  doubleValue?: number;
  booleanValue?: boolean;
  nullValue?: null;
  arrayValue?: { values?: FirestoreValue[] };
  mapValue?: { fields?: Record<string, FirestoreValue> };
}

interface FirestoreDocument {
  fields?: Record<string, FirestoreValue>;
}

export interface FirestoreListResponse {
  documents?: FirestoreDocument[];
}

function parseFirestoreValue(value: FirestoreValue): unknown {
  if (value.stringValue !== undefined) {
    return value.stringValue;
  }
  if (value.integerValue !== undefined) {
    return Number(value.integerValue);
  }
  if (value.doubleValue !== undefined) {
    return value.doubleValue;
  }
  if (value.booleanValue !== undefined) {
    return value.booleanValue;
  }
  if (value.arrayValue) {
    return (value.arrayValue.values || []).map(parseFirestoreValue);
  }
  if (value.mapValue) {
    return parseFirestoreDocument({ fields: value.mapValue.fields });
  }
  return null;
}

export function parseFirestoreDocument(document: FirestoreDocument): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(document.fields || {})) {
    result[key] = parseFirestoreValue(value);
  }
  return result;
}

export function firestoreCollectionUrl(collectionPath: string): string {
  const { projectId, apiKey } = environment.firebase;
  return `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collectionPath}?key=${apiKey}`;
}
