'use server';

import { 
    getAuth, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword,
    Auth
} from 'firebase/auth';
import { 
    getFirestore, 
    collection, 
    query, 
    where, 
    getDocs, 
    doc, 
    setDoc,
    Firestore
} from 'firebase/firestore';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { firebaseConfig } from '@/firebase/config';


// --- Types ---
export type SignUpDetails = {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    pin: string;
};

// --- Helper Functions ---

/**
 * A placeholder password generation scheme.
 * In a real-world scenario, you should use a more secure method,
 * possibly a server-side function, or a more complex client-side KDF.
 * For this prototype, we'll use a simple, deterministic method.
 * @param pin - The user's 4-digit PIN.
 * @returns A password string derived from the PIN.
 */
const generatePasswordFromPin = (pin: string): string => {
    // This is NOT secure for production. It's a deterministic placeholder.
    return `${pin}${pin.split('').reverse().join('')}${pin}`;
};

function getFirebaseServices(): { app: FirebaseApp; auth: Auth; firestore: Firestore } {
    const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    const auth = getAuth(app);
    const firestore = getFirestore(app);
    return { app, auth, firestore };
}


// --- Core Authentication Functions ---

/**
 * Logs a user in using either their email or phone number.
 * @param identifier - The user's email or phone number.
 * @param pin - The user's 4-digit PIN.
 */
export const loginWithIdentifier = async (identifier: string, pin: string): Promise<void> => {
    const { auth, firestore } = getFirebaseServices();
    const password = generatePasswordFromPin(pin);

    let userEmail = identifier;

    // If the identifier is not an email, assume it's a phone number and find the user's email.
    if (!identifier.includes('@')) {
        try {
            const usersRef = collection(firestore, "users");
            const q = query(usersRef, where("phoneNumber", "==", identifier));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                throw new Error("Aucun compte n'est associé à ce numéro de téléphone.");
            }
            
            const userDoc = querySnapshot.docs[0].data();
            if (!userDoc.email) {
                 throw new Error("Le profil utilisateur est incomplet et ne peut pas être utilisé pour la connexion.");
            }
            userEmail = userDoc.email;

        } catch (error) {
             console.error("Error fetching user by phone number:", error);
             throw new Error("Impossible de trouver l'utilisateur. Vérifiez vos informations.");
        }
    }
    
    // Attempt to sign in with the resolved email.
    try {
        await signInWithEmailAndPassword(auth, userEmail, password);
    } catch (error: any) {
        console.error("Firebase signInWithEmailAndPassword error: ", error.code);
        if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
             throw new Error("L'identifiant ou le code PIN est incorrect.");
        }
        throw new Error("Une erreur inattendue est survenue lors de la connexion.");
    }
};

/**
 * Signs up a new user and creates their profile in Firestore.
 * @param details - The user's signup details.
 */
export const signupWithDetails = async (details: SignUpDetails): Promise<void> => {
    const { auth, firestore } = getFirebaseServices();
    const { email, pin, firstName, lastName, phoneNumber } = details;

    const password = generatePasswordFromPin(pin);

    try {
        // Step 1: Create the user in Firebase Authentication
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const newUser = userCredential.user;

        // Step 2: Create the user's profile document in Firestore
        const userDocRef = doc(firestore, 'users', newUser.uid);
        const userData = {
            id: newUser.uid,
            firstName,
            lastName,
            email,
            phoneNumber,
            alias: phoneNumber, // Use phone number as the primary alias
            role: 'user',
            isSuspended: false,
            balance: 0, // Start with a zero balance
            createdAt: new Date().toISOString(),
        };

        await setDoc(userDocRef, userData);

    } catch (error: any) {
         console.error("Firebase createUserWithEmailAndPassword error: ", error.code);
         if (error.code === 'auth/email-already-in-use') {
             throw new Error("Cette adresse e-mail est déjà utilisée par un autre compte.");
         }
         if (error.code === 'auth/weak-password') {
              throw new Error("Le mot de passe généré est trop faible. Veuillez choisir un autre PIN.");
         }
         throw new Error("Une erreur inattendue est survenue lors de l'inscription.");
    }
};


/**
 * Logs out the currently signed-in user.
 */
export const logout = async (): Promise<void> => {
    const { auth } = getFirebaseServices();
    await auth.signOut();
};
