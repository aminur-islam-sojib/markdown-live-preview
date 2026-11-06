import { initializeApp } from 'firebase/app';
import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    onAuthStateChanged
} from 'firebase/auth';
import {
    getFirestore,
    collection,
    doc,
    addDoc,
    setDoc,
    getDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    query,
    orderBy,
    serverTimestamp
} from 'firebase/firestore';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const requiredConfigKeys = [
    ['apiKey', 'VITE_FIREBASE_API_KEY'],
    ['authDomain', 'VITE_FIREBASE_AUTH_DOMAIN'],
    ['projectId', 'VITE_FIREBASE_PROJECT_ID'],
    ['appId', 'VITE_FIREBASE_APP_ID']
];

const missingKeys = requiredConfigKeys
    .filter(([prop]) => !firebaseConfig[prop])
    .map(([, envVar]) => envVar);

let app = null;
let auth = null;
let db = null;

if (missingKeys.length > 0) {
    console.error(`Firebase: Missing required environment variable(s): ${missingKeys.join(', ')}. Firebase features will be disabled.`);
} else {
    try {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
    } catch (error) {
        console.error('Firebase initialization failed:', error);
    }
}

export { auth, db };

/**
 * Sign in using Google Auth popup.
 * @returns {Promise<import('firebase/auth').User>}
 */
export async function login() {
    if (!auth) {
        throw new Error('Firebase Auth is not initialized. Please check your environment variables.');
    }
    try {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        return result.user;
    } catch (error) {
        if (error?.code === 'auth/popup-blocked') {
            throw new Error('Sign-in popup was blocked by your browser. Please allow popups and try again.');
        }
        if (error?.code === 'auth/popup-closed-by-user') {
            throw new Error('Sign-in popup was closed before completing. Please try again.');
        }
        if (error?.code === 'auth/cancelled-popup-request') {
            throw new Error('A sign-in popup is already open. Please complete or close it first.');
        }
        throw new Error(error?.message || 'Failed to sign in with Google.');
    }
}

/**
 * Sign out current user.
 * @returns {Promise<void>}
 */
export async function logout() {
    if (!auth) {
        return;
    }
    try {
        await signOut(auth);
    } catch (error) {
        throw new Error(error?.message || 'Failed to sign out.');
    }
}

/**
 * Subscribe to auth state changes.
 * @param {(user: import('firebase/auth').User | null) => void} callback
 * @returns {() => void} Unsubscribe function
 */
export function onUser(callback) {
    if (!auth) {
        callback(null);
        return () => {};
    }
    return onAuthStateChanged(auth, callback);
}

/**
 * Save or update a document in users/{uid}/documents/{id}.
 * @param {string} uid User ID
 * @param {{ id?: string, title: string, content: string }} docData
 * @returns {Promise<string>} Document ID
 */
export async function saveDocument(uid, { id, title, content }) {
    if (!db) {
        throw new Error('Firestore is not initialized. Please check your environment variables.');
    }
    if (!uid) {
        throw new Error('User ID is required to save document.');
    }
    try {
        if (id) {
            const docRef = doc(db, 'users', uid, 'documents', id);
            await setDoc(docRef, {
                title: title ?? 'Untitled',
                content: content ?? '',
                updatedAt: serverTimestamp()
            }, { merge: true });
            return id;
        } else {
            const colRef = collection(db, 'users', uid, 'documents');
            const docRef = await addDoc(colRef, {
                title: title ?? 'Untitled',
                content: content ?? '',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            return docRef.id;
        }
    } catch (error) {
        throw new Error(error?.message || 'Failed to save document.');
    }
}

/**
 * Retrieve a single document by ID.
 * @param {string} uid User ID
 * @param {string} id Document ID
 * @returns {Promise<{ id: string, title: string, content: string, createdAt: any, updatedAt: any } | null>}
 */
export async function getDocument(uid, id) {
    if (!db) {
        throw new Error('Firestore is not initialized. Please check your environment variables.');
    }
    if (!uid || !id) {
        throw new Error('User ID and Document ID are required.');
    }
    try {
        const docRef = doc(db, 'users', uid, 'documents', id);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) {
            return null;
        }
        const data = docSnap.data();
        return {
            id: docSnap.id,
            title: data.title ?? '',
            content: data.content ?? '',
            createdAt: data.createdAt ?? null,
            updatedAt: data.updatedAt ?? null
        };
    } catch (error) {
        throw new Error(error?.message || 'Failed to get document.');
    }
}

/**
 * List all documents belonging to a user, ordered by updatedAt desc.
 * @param {string} uid User ID
 * @returns {Promise<Array<{ id: string, title: string, content: string, createdAt: any, updatedAt: any }>>}
 */
export async function listDocuments(uid) {
    if (!db) {
        throw new Error('Firestore is not initialized. Please check your environment variables.');
    }
    if (!uid) {
        throw new Error('User ID is required to list documents.');
    }
    try {
        const colRef = collection(db, 'users', uid, 'documents');
        const q = query(colRef, orderBy('updatedAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const docs = [];
        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            docs.push({
                id: docSnap.id,
                title: data.title ?? '',
                content: data.content ?? '',
                createdAt: data.createdAt ?? null,
                updatedAt: data.updatedAt ?? null
            });
        });
        return docs;
    } catch (error) {
        throw new Error(error?.message || 'Failed to list documents.');
    }
}

/**
 * Rename a document.
 * @param {string} uid User ID
 * @param {string} id Document ID
 * @param {string} title New title
 * @returns {Promise<void>}
 */
export async function renameDocument(uid, id, title) {
    if (!db) {
        throw new Error('Firestore is not initialized. Please check your environment variables.');
    }
    if (!uid || !id) {
        throw new Error('User ID and Document ID are required to rename document.');
    }
    try {
        const docRef = doc(db, 'users', uid, 'documents', id);
        await updateDoc(docRef, {
            title: title ?? 'Untitled',
            updatedAt: serverTimestamp()
        });
    } catch (error) {
        throw new Error(error?.message || 'Failed to rename document.');
    }
}

/**
 * Delete a document.
 * @param {string} uid User ID
 * @param {string} id Document ID
 * @returns {Promise<void>}
 */
export async function deleteDocument(uid, id) {
    if (!db) {
        throw new Error('Firestore is not initialized. Please check your environment variables.');
    }
    if (!uid || !id) {
        throw new Error('User ID and Document ID are required to delete document.');
    }
    try {
        const docRef = doc(db, 'users', uid, 'documents', id);
        await deleteDoc(docRef);
    } catch (error) {
        throw new Error(error?.message || 'Failed to delete document.');
    }
}
