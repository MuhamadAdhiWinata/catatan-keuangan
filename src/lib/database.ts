import Dexie, { Table } from 'dexie';

// Database Types
export interface User {
  id?: number;
  username: string;
  password: string;
  createdAt: Date;
}

export interface Account {
  id?: number;
  userId: number;
  name: string;
  type: 'bank' | 'cash' | 'e-wallet' | 'investment';
  balance: number;
  createdAt: Date;
}

export interface Category {
  id?: number;
  userId: number;
  name: string;
  type: 'income' | 'expense' | 'transfer';
  icon?: string;
}

export interface Transaction {
  id?: number;
  userId: number;
  accountId: number;
  categoryId: number;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  date: Date;
  note?: string;
  destinationAccountId?: number; // For transfers
  createdAt: Date;
}

// Database Class
class FinanceDatabase extends Dexie {
  users!: Table<User>;
  accounts!: Table<Account>;
  categories!: Table<Category>;
  transactions!: Table<Transaction>;

  constructor() {
    super('FinanceTracker');
    
    this.version(1).stores({
      users: '++id, username',
      accounts: '++id, userId, type',
      categories: '++id, userId, type',
      transactions: '++id, userId, accountId, categoryId, type, date',
    });
  }
}

export const db = new FinanceDatabase();

// Seed default categories for a user
export async function seedCategories(userId: number) {
  const existingCategories = await db.categories.where('userId').equals(userId).count();
  
  if (existingCategories > 0) return;

  const defaultCategories: Omit<Category, 'id'>[] = [
    // Kategori Pemasukan
    { userId, name: 'Gaji', type: 'income', icon: '💰' },
    { userId, name: 'Bonus', type: 'income', icon: '🎁' },
    { userId, name: 'Pengembalian Dana', type: 'income', icon: '↩️' },
    { userId, name: 'Hasil Investasi', type: 'income', icon: '📈' },
    { userId, name: 'Freelance', type: 'income', icon: '💼' },
    { userId, name: 'Pemasukan Lain', type: 'income', icon: '➕' },
    
    // Kategori Pengeluaran
    { userId, name: 'Makanan & Minuman', type: 'expense', icon: '🍔' },
    { userId, name: 'Transportasi', type: 'expense', icon: '🚗' },
    { userId, name: 'Listrik & Air', type: 'expense', icon: '💡' },
    { userId, name: 'Belanja', type: 'expense', icon: '🛍️' },
    { userId, name: 'Hiburan', type: 'expense', icon: '🎬' },
    { userId, name: 'Kesehatan', type: 'expense', icon: '🏥' },
    { userId, name: 'Pendidikan', type: 'expense', icon: '📚' },
    { userId, name: 'Sewa/Kontrakan', type: 'expense', icon: '🏠' },
    { userId, name: 'Asuransi', type: 'expense', icon: '🛡️' },
    { userId, name: 'Langganan', type: 'expense', icon: '📱' },
    { userId, name: 'Pengeluaran Lain', type: 'expense', icon: '➖' },
    
    // Kategori Transfer
    { userId, name: 'Bank ke Tunai', type: 'transfer', icon: '🏦' },
    { userId, name: 'Tunai ke Bank', type: 'transfer', icon: '💵' },
    { userId, name: 'Ke E-Wallet', type: 'transfer', icon: '📲' },
    { userId, name: 'Dari E-Wallet', type: 'transfer', icon: '📱' },
    { userId, name: 'Transfer Investasi', type: 'transfer', icon: '📊' },
    { userId, name: 'Transfer Internal', type: 'transfer', icon: '🔄' },
  ];

  await db.categories.bulkAdd(defaultCategories);
}

// Helper functions
export async function updateAccountBalance(accountId: number, amount: number) {
  const account = await db.accounts.get(accountId);
  if (account) {
    await db.accounts.update(accountId, { 
      balance: account.balance + amount 
    });
  }
}

export async function createTransaction(
  transaction: Omit<Transaction, 'id' | 'createdAt'>
) {
  const now = new Date();
  
  // Start a transaction for atomicity
  await db.transaction('rw', db.transactions, db.accounts, async () => {
    // Create the transaction record
    await db.transactions.add({
      ...transaction,
      createdAt: now,
    });

    // Update account balances
    if (transaction.type === 'income') {
      await updateAccountBalance(transaction.accountId, transaction.amount);
    } else if (transaction.type === 'expense') {
      await updateAccountBalance(transaction.accountId, -transaction.amount);
    } else if (transaction.type === 'transfer' && transaction.destinationAccountId) {
      await updateAccountBalance(transaction.accountId, -transaction.amount);
      await updateAccountBalance(transaction.destinationAccountId, transaction.amount);
    }
  });
}

export async function deleteTransaction(transactionId: number) {
  const transaction = await db.transactions.get(transactionId);
  if (!transaction) return;

  await db.transaction('rw', db.transactions, db.accounts, async () => {
    // Reverse the balance changes
    if (transaction.type === 'income') {
      await updateAccountBalance(transaction.accountId, -transaction.amount);
    } else if (transaction.type === 'expense') {
      await updateAccountBalance(transaction.accountId, transaction.amount);
    } else if (transaction.type === 'transfer' && transaction.destinationAccountId) {
      await updateAccountBalance(transaction.accountId, transaction.amount);
      await updateAccountBalance(transaction.destinationAccountId, -transaction.amount);
    }

    await db.transactions.delete(transactionId);
  });
}

export async function updateTransaction(
  transactionId: number,
  updates: Partial<Omit<Transaction, 'id' | 'createdAt'>>
) {
  const oldTransaction = await db.transactions.get(transactionId);
  if (!oldTransaction) return;

  await db.transaction('rw', db.transactions, db.accounts, async () => {
    // Reverse old balance changes
    if (oldTransaction.type === 'income') {
      await updateAccountBalance(oldTransaction.accountId, -oldTransaction.amount);
    } else if (oldTransaction.type === 'expense') {
      await updateAccountBalance(oldTransaction.accountId, oldTransaction.amount);
    } else if (oldTransaction.type === 'transfer' && oldTransaction.destinationAccountId) {
      await updateAccountBalance(oldTransaction.accountId, oldTransaction.amount);
      await updateAccountBalance(oldTransaction.destinationAccountId, -oldTransaction.amount);
    }

    // Update the transaction
    await db.transactions.update(transactionId, updates);

    // Apply new balance changes
    const newTransaction = { ...oldTransaction, ...updates };
    if (newTransaction.type === 'income') {
      await updateAccountBalance(newTransaction.accountId, newTransaction.amount);
    } else if (newTransaction.type === 'expense') {
      await updateAccountBalance(newTransaction.accountId, -newTransaction.amount);
    } else if (newTransaction.type === 'transfer' && newTransaction.destinationAccountId) {
      await updateAccountBalance(newTransaction.accountId, -newTransaction.amount);
      await updateAccountBalance(newTransaction.destinationAccountId, newTransaction.amount);
    }
  });
}
