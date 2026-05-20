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
  if (!auth.currentUser) return;
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
  if (!auth.currentUser) return;
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
  if (!auth.currentUser) return;
  const uid = auth.currentUser.uid;
  try {
    const batchPromises = cards.map((card) =>
      addDoc(collection(db, "flashcards"), {
        ...card,
        uid,
        title,
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
  if (!auth.currentUser) return;
  try {
    const cardRef = doc(db, "flashcards", docId);

    // Read the card's current SM-2 state from Firestore
    const cardSnap = await getDoc(cardRef);
    const cardData = cardSnap.exists() ? cardSnap.data() : {};
    const prevInterval: number = cardData.interval ?? 1;
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

      if (prevInterval <= 1) {
        interval = 1;
      } else if (prevInterval === 1) {
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
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Read uid into a local variable so it is stable in the closure
    // and can be safely used in the dependency array (Fix 7).
    const uid = auth.currentUser?.uid;
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
  }, [collectionName, limitCount, auth.currentUser?.uid]);

  return { data, loading };
}
