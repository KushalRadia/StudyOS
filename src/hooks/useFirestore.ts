import { useState, useEffect } from "react";
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  increment,
  serverTimestamp,
  query,
  where,
  orderBy,
  limit,
  deleteDoc,
  onSnapshot,
} from "firebase/firestore";
import { db, auth } from "../firebase/config";
import { useAuth } from "./useAuth";

const isDevBypass = () => {
  return !auth.currentUser && localStorage.getItem("studyos_dev_uid") === "dev-user-123";
};

const getMockData = (collectionName: string): any[] => {
  const dbStr = localStorage.getItem("studyos_mock_firestore");
  if (!dbStr) return [];
  try {
    const mockDb = JSON.parse(dbStr);
    return mockDb[collectionName] || [];
  } catch {
    return [];
  }
};

const saveMockData = (collectionName: string, items: any[]) => {
  const dbStr = localStorage.getItem("studyos_mock_firestore");
  let mockDb: any = {};
  if (dbStr) {
    try {
      mockDb = JSON.parse(dbStr);
    } catch {
      mockDb = {};
    }
  }
  mockDb[collectionName] = items;
  localStorage.setItem("studyos_mock_firestore", JSON.stringify(mockDb));
};

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  };
}

function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path,
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function deleteHistoryEntry(
  collectionName: string,
  docId: string,
) {
  if (isDevBypass()) {
    const items = getMockData(collectionName);
    const updated = items.filter((item) => item.id !== docId);
    saveMockData(collectionName, updated);

    if (collectionName !== "history") {
      const histItems = getMockData("history");
      const updatedHist = histItems.filter((item) => item.id !== docId);
      saveMockData("history", updatedHist);
    }
    window.dispatchEvent(new Event("studyos_db_update"));
    return;
  }

  if (!auth.currentUser) return;
  try {
    await deleteDoc(doc(db, collectionName, docId));
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.DELETE,
      `${collectionName}/${docId}`,
    );
  }
}

export async function saveToolUsage(toolName: string) {
  if (isDevBypass()) {
    console.debug(`[Dev Bypass] saveToolUsage: ${toolName}`);
    return;
  }
  if (!auth.currentUser) {
    // Dev-bypass: silently skip Firestore write
    console.debug(`[Dev] saveToolUsage skipped for: ${toolName}`);
    return;
  }
  const userRef = doc(db, "users", auth.currentUser.uid);
  try {
    await updateDoc(userRef, {
      [`toolUsage.${toolName}`]: increment(1),
    });
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.UPDATE,
      `users/${auth.currentUser.uid}`,
    );
  }
}

export async function addHistoryEntry(collectionName: string, data: any) {
  if (isDevBypass()) {
    const entry = {
      ...data,
      id: Math.random().toString(36).substring(2, 9),
      uid: "dev-user-123",
      createdAt: new Date().toISOString(),
      toolCollection: collectionName,
    };

    const items = getMockData(collectionName);
    items.unshift(entry);
    saveMockData(collectionName, items);

    if (collectionName !== "history") {
      const histItems = getMockData("history");
      histItems.unshift(entry);
      saveMockData("history", histItems);
    }

    window.dispatchEvent(new Event("studyos_db_update"));
    return entry.id;
  }

  if (!auth.currentUser) {
    // Dev-bypass: silently skip Firestore write
    console.debug(`[Dev] addHistoryEntry skipped for: ${collectionName}`);
    return;
  }
  try {
    const entry = {
      ...data,
      uid: auth.currentUser.uid,
      createdAt: serverTimestamp(),
      toolCollection: collectionName,
    };

    // Add to specific collection
    const docRef = await addDoc(collection(db, collectionName), entry);

    // Only write to unified history if not already writing to it directly,
    // to prevent accidental double-writes.
    if (collectionName !== "history") {
      await addDoc(collection(db, "history"), entry);
    }

    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, collectionName);
  }
}

export async function createFlashcardSet(
  title: string,
  cards: { front: string; back: string }[],
) {
  const safeTitle = title.substring(0, 200);
  if (isDevBypass()) {
    const flashcards = getMockData("flashcards");
    const newCards = cards.map((card) => ({
      ...card,
      id: Math.random().toString(36).substring(2, 9),
      uid: "dev-user-123",
      title: safeTitle,
      status: "new",
      interval: 0,
      factor: 2.5,
      nextReview: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    }));
    flashcards.push(...newCards);
    saveMockData("flashcards", flashcards);
    window.dispatchEvent(new Event("studyos_db_update"));
    return;
  }

  if (!auth.currentUser) return;
  const uid = auth.currentUser.uid;
  try {
    const batchPromises = cards.map((card) =>
      addDoc(collection(db, "flashcards"), {
        ...card,
        uid,
        title: safeTitle,
        status: "new",
        interval: 0,
        factor: 2.5,
        nextReview: serverTimestamp(),
        createdAt: serverTimestamp(),
      }),
    );
    await Promise.all(batchPromises);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, "flashcards");
  }
}

export async function updateFlashcardRepetition(docId: string, rating: number) {
  if (isDevBypass()) {
    const flashcards = getMockData("flashcards");
    const cardIndex = flashcards.findIndex((c) => c.id === docId);
    if (cardIndex === -1) return;

    const cardData = flashcards[cardIndex];
    const prevInterval: number = cardData.interval ?? 0;
    const prevFactor: number = cardData.factor ?? 2.5;

    let interval: number;
    let factor: number;

    if (rating === 0) {
      interval = 1;
      factor = Math.max(1.3, prevFactor - 0.2);
    } else {
      const q = rating + 2;
      factor = Math.max(1.3, prevFactor + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));

      if (prevInterval === 0) {
        interval = 1;
      } else if (prevInterval <= 1) {
        interval = 6;
      } else {
        interval = Math.round(prevInterval * factor);
      }
      interval = Math.max(interval, prevInterval + 1);
    }

    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + interval);

    flashcards[cardIndex] = {
      ...cardData,
      interval,
      factor,
      nextReview: nextReview.toISOString(),
      lastReviewed: new Date().toISOString(),
      status: rating === 0 ? "learning" : "reviewing",
    };

    saveMockData("flashcards", flashcards);
    window.dispatchEvent(new Event("studyos_db_update"));
    return;
  }

  if (!auth.currentUser) return;
  try {
    const cardRef = doc(db, "flashcards", docId);

    // Read the card's current SM-2 state from Firestore
    const cardSnap = await getDoc(cardRef);
    const cardData = cardSnap.exists() ? cardSnap.data() : {};
    const prevInterval: number = cardData.interval ?? 0;
    const prevFactor: number = cardData.factor ?? 2.5;

    // SM-2 algorithm carrying forward previous interval and factor.
    // Rating: 0 = Forgot, 1 = Hard, 2 = Good, 3 = Easy
    let interval: number;
    let factor: number;

    if (rating === 0) {
      // Forgot — reset interval, reduce factor (min 1.3)
      interval = 1;
      factor = Math.max(1.3, prevFactor - 0.2);
    } else {
      // Recalled — apply SM-2 factor adjustment
      // q = 3 (Hard), 4 (Good), 5 (Easy) mapped from rating 1, 2, 3
      const q = rating + 2; // 1→3, 2→4, 3→5
      factor = Math.max(1.3, prevFactor + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));

      if (prevInterval === 0) {
        interval = 1;
      } else if (prevInterval <= 1) {
        interval = 6;
      } else {
        interval = Math.round(prevInterval * factor);
      }
      // Enforce minimum progression
      interval = Math.max(interval, prevInterval + 1);
    }

    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + interval);

    await updateDoc(cardRef, {
      interval,
      factor,
      nextReview,
      lastReviewed: serverTimestamp(),
      status: rating === 0 ? "learning" : "reviewing",
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `flashcards/${docId}`);
  }
}

export function useHistory(collectionName: string, limitCount = 10) {
  const { user } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isDevBypass()) {
      const loadLocalData = () => {
        const items = getMockData(collectionName);
        setData(items.slice(0, limitCount));
        setLoading(false);
      };

      loadLocalData();

      window.addEventListener("studyos_db_update", loadLocalData);
      return () => {
        window.removeEventListener("studyos_db_update", loadLocalData);
      };
    }

    // Read uid into a local variable so it is stable in the closure
    // and can be safely used in the dependency array (Fix 7).
    const uid = user?.uid;
    if (!uid) return;

    const q = query(
      collection(db, collectionName),
      where("uid", "==", uid),
      orderBy("createdAt", "desc"),
      limit(limitCount),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setData(items);
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, collectionName);
      },
    );

    return () => unsubscribe();
  }, [collectionName, limitCount, user?.uid]);

  return { data, loading };
}
