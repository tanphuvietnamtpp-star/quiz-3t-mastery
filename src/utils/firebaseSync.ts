import { db } from "./firebase";
import { collection, doc, getDocs, setDoc, deleteDoc, writeBatch } from "firebase/firestore";
import { UserRole, UserStatus } from "../types";
import { 
  initialUsers, 
  initialReports, 
  initialCompanies, 
  initialBranches, 
  initialDepartments, 
  initialBroadcastNotice, 
  initialChatMessages, 
  initialProductsCatalog, 
  initialMoldsCatalog, 
  initialProductionRequests, 
  initialProductionRequestItemsMap, 
  initialOrderImplementations 
} from "../data";

// Collections list
export const COLLECTIONS = {
  USERS: "user_profiles",
  REPORTS: "reports",
  COMPANIES: "companies",
  BRANCHES: "branches",
  DEPARTMENTS: "departments",
  BROADCASTS: "broadcasts",
  CHATS: "chats",
  PRODUCTION_REQUESTS: "productionRequests",
  PRODUCTION_REQUEST_ITEMS: "productionRequestItems",
  ORDER_IMPLEMENTATIONS: "orderImplementations",
  PRODUCTS_CATALOG: "productsCatalog",
  MOLDS_CATALOG: "moldsCatalog"
};

/**
 * Checks if a collection is empty, and if so, seeds it with initial data.
 */
export async function seedFirestoreIfNeeded(): Promise<boolean> {
  if (!db) {
    console.warn("Firestore not initialized, skipping seed.");
    return false;
  }

  try {
    const userSnap = await getDocs(collection(db, COLLECTIONS.USERS));
    if (userSnap.empty) {
      console.log("Firestore user_profiles collection is empty. Seeding initial data...");
      
      const batch = writeBatch(db);
      
      // Seed users with the mapped attributes
      initialUsers.forEach((u) => {
        const docRef = doc(db, COLLECTIONS.USERS, u.id);
        
        // Map fields to requested firestore schema
        const dbUser: any = {
          id: u.id,
          phoneNumber: u.phone || "",
          name: u.fullName || "",
          department: u.department || "",
          branch: u.branch || "",
          company: u.company || "TÂN PHÚ VIỆT NAM",
          createdAt: new Date().toISOString()
        };

        // Role mapping
        if (u.role === UserRole.ADMIN) {
          dbUser.role = "admin";
        } else if (u.role === UserRole.REVIEWER) {
          dbUser.role = "approver";
        } else {
          dbUser.role = "employee";
        }

        // Status mapping
        if (u.status === UserStatus.PENDING) {
          dbUser.status = "pending";
        } else if (u.status === UserStatus.ACTIVE) {
          dbUser.status = "approved";
        } else if (u.status === UserStatus.REJECTED) {
          dbUser.status = "rejected";
        } else if (u.status === UserStatus.LOCKED) {
          dbUser.status = "locked";
        } else {
          dbUser.status = "approved";
        }

        // Preserve password if it exists
        if (u.password) dbUser.password = u.password;

        batch.set(docRef, dbUser);
      });

      // Seed companies
      initialCompanies.forEach((c) => {
        const docRef = doc(db, COLLECTIONS.COMPANIES, c.id);
        batch.set(docRef, c);
      });

      // Seed branches
      initialBranches.forEach((b) => {
        const docRef = doc(db, COLLECTIONS.BRANCHES, b.id);
        batch.set(docRef, b);
      });

      // Seed departments
      initialDepartments.forEach((d) => {
        const docRef = doc(db, COLLECTIONS.DEPARTMENTS, d.id);
        batch.set(docRef, d);
      });

      // Seed reports
      initialReports.forEach((r) => {
        const docRef = doc(db, COLLECTIONS.REPORTS, r.id);
        batch.set(docRef, r);
      });

      // Seed broadcasts
      initialBroadcastNotice.forEach((b) => {
        const docRef = doc(db, COLLECTIONS.BROADCASTS, b.id);
        batch.set(docRef, b);
      });

      // Seed chats
      initialChatMessages.forEach((c) => {
        const docRef = doc(db, COLLECTIONS.CHATS, c.id);
        batch.set(docRef, c);
      });

      // Seed products catalog
      initialProductsCatalog.forEach((p) => {
        const docRef = doc(db, COLLECTIONS.PRODUCTS_CATALOG, p.code);
        batch.set(docRef, p);
      });

      // Seed molds catalog
      initialMoldsCatalog.forEach((m) => {
        const docRef = doc(db, COLLECTIONS.MOLDS_CATALOG, m.code);
        batch.set(docRef, m);
      });

      // Seed production requests
      initialProductionRequests.forEach((pr) => {
        const docRef = doc(db, COLLECTIONS.PRODUCTION_REQUESTS, pr.id);
        batch.set(docRef, pr);
      });

      // Seed production request items (by key as id)
      Object.entries(initialProductionRequestItemsMap).forEach(([prId, items]) => {
        const docRef = doc(db, COLLECTIONS.PRODUCTION_REQUEST_ITEMS, prId);
        batch.set(docRef, { prId, items });
      });

      // Seed order implementations
      initialOrderImplementations.forEach((oi) => {
        const docRef = doc(db, COLLECTIONS.ORDER_IMPLEMENTATIONS, oi.id);
        batch.set(docRef, oi);
      });

      await batch.commit();
      console.log("All collections seeded successfully into Firestore!");
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error seeding Firestore:", error);
    return false;
  }
}

/**
 * Fetches all documents from a Firestore collection.
 */
export async function fetchCollection<T>(collectionName: string): Promise<T[]> {
  if (!db) return [];
  try {
    const snap = await getDocs(collection(db, collectionName));
    const items: T[] = [];
    snap.forEach((doc) => {
      const data = { ...doc.data() } as any;
      if (collectionName === "user_profiles") {
        // Map database schema fields to App internal fields
        const appUser: any = {
          ...data,
          id: doc.id || data.id,
          phone: data.phone || data.phoneNumber || "",
          fullName: data.fullName || data.name || "",
          createdAt: data.createdAt || new Date().toISOString()
        };
        
        // Map role string value to App's UserRole enum
        if (data.role === "admin") appUser.role = "CHỦ ADMIN";
        else if (data.role === "approver") appUser.role = "DUYỆT VIÊN";
        else if (data.role === "employee") appUser.role = "NHÂN VIÊN";
        else if (data.role) appUser.role = data.role; // Backup
        
        // Map status string value to App's UserStatus enum
        if (data.status === "pending") appUser.status = "Chờ phê duyệt";
        else if (data.status === "approved" || data.status === "active") appUser.status = "Đã hoạt động";
        else if (data.status === "rejected") appUser.status = "Bị từ chối";
        else if (data.status === "locked") appUser.status = "Đã khóa";
        else if (data.status) appUser.status = data.status; // Backup
        
        items.push(appUser as T);
      } else {
        items.push({ ...data } as T);
      }
    });
    return items;
  } catch (error) {
    console.error(`Error fetching collection ${collectionName}:`, error);
    return [];
  }
}

/**
 * Saves a document to a Firestore collection.
 */
export async function saveDocument(collectionName: string, id: string, data: any): Promise<boolean> {
  if (!db) return false;
  try {
    let rawData = { ...data };
    if (collectionName === "user_profiles") {
      // Map App internal fields back to Database schema fields
      const dbUser: any = {
        ...rawData,
        id: id || rawData.id,
        phoneNumber: rawData.phone || rawData.phoneNumber || "",
        name: rawData.fullName || rawData.name || "",
        createdAt: rawData.createdAt || new Date().toISOString()
      };
      
      // Map App's UserRole enum to database role string value
      if (rawData.role === "CHỦ ADMIN" || rawData.role === "admin") dbUser.role = "admin";
      else if (rawData.role === "DUYỆT VIÊN" || rawData.role === "approver") dbUser.role = "approver";
      else if (rawData.role === "NHÂN VIÊN" || rawData.role === "employee") dbUser.role = "employee";
      else dbUser.role = "employee"; // Fallback
      
      // Map App's UserStatus enum to database status string value
      if (rawData.status === "Chờ phê duyệt" || rawData.status === "pending") dbUser.status = "pending";
      else if (rawData.status === "Đã hoạt động" || rawData.status === "approved" || rawData.status === "Đã duyệt") dbUser.status = "approved";
      else if (rawData.status === "Bị từ chối" || rawData.status === "rejected") dbUser.status = "rejected";
      else if (rawData.status === "Đã khóa" || rawData.status === "locked") dbUser.status = "locked";
      else dbUser.status = "pending"; // Fallback
      
      rawData = dbUser;
    }
    
    const docRef = doc(db, collectionName, id);
    await setDoc(docRef, rawData, { merge: true });
    return true;
  } catch (error) {
    console.error(`Error saving doc ${id} to ${collectionName}:`, error);
    return false;
  }
}

/**
 * Deletes a document from a Firestore collection.
 */
export async function deleteDocument(collectionName: string, id: string): Promise<boolean> {
  if (!db) return false;
  try {
    const docRef = doc(db, collectionName, id);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.error(`Error deleting doc ${id} from ${collectionName}:`, error);
    return false;
  }
}
