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
    // Income categories
    { userId, name: 'Salary', type: 'income', icon: '💰' },
    { userId, name: 'Bonus', type: 'income', icon: '🎁' },
    { userId, name: 'Refund', type: 'income', icon: '↩️' },
    { userId, name: 'Investment Returns', type: 'income', icon: '📈' },
    { userId, name: 'Freelance', type: 'income', icon: '💼' },
    { userId, name: 'Other Income', type: 'income', icon: '➕' },
    
    // Expense categories
    { userId, name: 'Food & Dining', type: 'expense', icon: '🍔' },
    { userId, name: 'Transport', type: 'expense', icon: '🚗' },
    { userId, name: 'Utilities', type: 'expense', icon: '💡' },
    { userId, name: 'Shopping', type: 'expense', icon: '🛍️' },
    { userId, name: 'Entertainment', type: 'expense', icon: '🎬' },
    { userId, name: 'Healthcare', type: 'expense', icon: '🏥' },
    { userId, name: 'Education', type: 'expense', icon: '📚' },
    { userId, name: 'Rent', type: 'expense', icon: '🏠' },
    { userId, name: 'Insurance', type: 'expense', icon: '🛡️' },
    { userId, name: 'Subscriptions', type: 'expense', icon: '📱' },
    { userId, name: 'Other Expense', type: 'expense', icon: '➖' },
    
    // Transfer categories
    { userId, name: 'Bank to Cash', type: 'transfer', icon: '🏦' },
    { userId, name: 'Cash to Bank', type: 'transfer', icon: '💵' },
    { userId, name: 'To E-Wallet', type: 'transfer', icon: '📲' },
    { userId, name: 'From E-Wallet', type: 'transfer', icon: '📱' },
    { userId, name: 'Investment Transfer', type: 'transfer', icon: '📊' },
    { userId, name: 'Internal Transfer', type: 'transfer', icon: '🔄' },
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
