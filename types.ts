
export interface Transaction {
  date: string;
  description: string;
  amount: number;
}

export interface ReconciliationResult {
  summary: {
    matchedCount: number;
    tallyOnlyCount: number;
    bankOnlyCount: number;
    totalMatchedAmount: number;
  };
  matchedTransactions: Transaction[];
  tallyOnlyTransactions: Transaction[];
  bankOnlyTransactions: Transaction[];
}

export enum StatementType {
  Tally = 'Tally',
  Bank = 'Bank',
}
