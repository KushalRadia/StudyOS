import { useState, useEffect } from "react";
import {
  collection,
  addDoc,
  updateDoc,
  doc,
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

    // Also add to unified history for dashboard
    await addDoc(collection(db, "history"), entry);

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

    // Simple SM-2 like logic
    // Rating: 0 = Forgot, 1 = Hard, 2 = Good, 3 = Easy
    let interval = 1;
    let factor = 2.5;

    if (rating === 0) {
      interval = 1;
      factor = 2.0;
    } else if (rating === 1) {
      interval = 3;
      factor = 2.2;
    } else if (rating === 2) {
      interval = 7;
      factor = 2.5;
    } else {
      interval = 14;
      factor = 2.8;
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
    if (!auth.currentUser) return;

    const q = query(
      collection(db, collectionName),
      where("uid", "==", auth.currentUser.uid),
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
