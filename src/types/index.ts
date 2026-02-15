export interface Group {
  id: string;
  members: string[]; // array of person IDs
  name: string;
  created: string;
  updated: string;
}

export interface Person {
  id: string;
  group: string;
  name: string;
  created: string;
  updated: string;
}

export interface Expense {
  id: string;
  group: string;
  description: string;
  amount: number;
  paidBy: string;
  splitAmong: string[]; // array of person IDs
  date: string;
  created: string;
  updated: string;
}

export interface Settlement {
  from: string; // person ID
  to: string; // person ID
  amount: number;
}
