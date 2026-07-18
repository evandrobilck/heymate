export const mockUser = {
  id: 'u1',
  name: 'Alex Silva',
  email: 'alex@example.com',
}

export const mockHouse = {
  id: 'h1',
  name: 'Sunny Share House',
  inviteCode: 'SUNNY23',
  members: [
    { id: 'u1', name: 'Alex Silva', role: 'admin', joinedAt: '2025-01-10', leftAt: null },
    { id: 'u2', name: 'Sam Nguyen', role: 'member', joinedAt: '2025-03-01', leftAt: null },
    { id: 'u3', name: 'Jamie Costa', role: 'member', joinedAt: '2024-11-01', leftAt: '2025-06-01' },
  ],
}

export const billCategories = [
  { id: 'rent', labelKey: 'billCategories.rent', icon: '🏠' },
  { id: 'utilities', labelKey: 'billCategories.utilities', icon: '💡' },
  { id: 'internet', labelKey: 'billCategories.internet', icon: '📶' },
  { id: 'groceries', labelKey: 'billCategories.groceries', icon: '🛒' },
  { id: 'other', labelKey: 'billCategories.other', icon: '📄' },
]

export const recurrenceOptions = ['none', 'weekly', 'monthly', 'yearly']

export const mockBills = [
  {
    id: 'b1',
    title: 'Electricity Bill',
    category: 'utilities',
    totalAmount: 120,
    dueDate: '2026-07-25',
    recurrence: 'monthly',
    splitType: 'equal',
    createdBy: 'u1',
    participantIds: ['u1', 'u2'],
    shares: {
      u1: { amount: 60, paid: false, paidAt: null },
      u2: { amount: 60, paid: true, paidAt: '2026-07-15' },
    },
  },
  {
    id: 'b2',
    title: 'Rent',
    category: 'rent',
    totalAmount: 900,
    dueDate: '2026-08-01',
    recurrence: 'monthly',
    splitType: 'percentage',
    createdBy: 'u1',
    participantIds: ['u1', 'u2'],
    shares: {
      u1: { percentage: 60, amount: 540, paid: false, paidAt: null },
      u2: { percentage: 40, amount: 360, paid: false, paidAt: null },
    },
  },
  {
    id: 'b3',
    title: 'Internet',
    category: 'internet',
    totalAmount: 80,
    dueDate: '2026-07-20',
    recurrence: 'monthly',
    splitType: 'exact',
    createdBy: 'u2',
    participantIds: ['u1', 'u2'],
    shares: {
      u1: { amount: 40, paid: true, paidAt: '2026-07-10' },
      u2: { amount: 40, paid: true, paidAt: '2026-07-10' },
    },
  },
  {
    id: 'b4',
    title: 'Groceries Run',
    category: 'groceries',
    totalAmount: 65,
    dueDate: '2026-07-05',
    recurrence: 'none',
    splitType: 'equal',
    createdBy: 'u2',
    participantIds: ['u1', 'u2'],
    shares: {
      u1: { amount: 32.5, paid: true, paidAt: '2026-07-05' },
      u2: { amount: 32.5, paid: true, paidAt: '2026-07-05' },
    },
  },
  {
    id: 'b5',
    title: 'Rent',
    category: 'rent',
    totalAmount: 900,
    dueDate: '2026-06-01',
    recurrence: 'monthly',
    splitType: 'percentage',
    createdBy: 'u1',
    participantIds: ['u1', 'u2'],
    shares: {
      u1: { percentage: 60, amount: 540, paid: true, paidAt: '2026-06-01' },
      u2: { percentage: 40, amount: 360, paid: true, paidAt: '2026-06-01' },
    },
  },
  {
    id: 'b6',
    title: 'Electricity Bill',
    category: 'utilities',
    totalAmount: 110,
    dueDate: '2026-06-25',
    recurrence: 'monthly',
    splitType: 'equal',
    createdBy: 'u1',
    participantIds: ['u1', 'u2'],
    shares: {
      u1: { amount: 55, paid: true, paidAt: '2026-06-20' },
      u2: { amount: 55, paid: true, paidAt: '2026-06-20' },
    },
  },
  {
    id: 'b7',
    title: 'Internet',
    category: 'internet',
    totalAmount: 80,
    dueDate: '2026-06-20',
    recurrence: 'monthly',
    splitType: 'exact',
    createdBy: 'u2',
    participantIds: ['u1', 'u2'],
    shares: {
      u1: { amount: 40, paid: true, paidAt: '2026-06-10' },
      u2: { amount: 40, paid: true, paidAt: '2026-06-10' },
    },
  },
  {
    id: 'b8',
    title: 'Groceries Run',
    category: 'groceries',
    totalAmount: 140,
    dueDate: '2026-06-12',
    recurrence: 'none',
    splitType: 'equal',
    createdBy: 'u1',
    participantIds: ['u1', 'u2'],
    shares: {
      u1: { amount: 70, paid: true, paidAt: '2026-06-12' },
      u2: { amount: 70, paid: true, paidAt: '2026-06-12' },
    },
  },
  {
    id: 'b9',
    title: 'Rent',
    category: 'rent',
    totalAmount: 850,
    dueDate: '2026-05-01',
    recurrence: 'monthly',
    splitType: 'percentage',
    createdBy: 'u1',
    participantIds: ['u1', 'u2'],
    shares: {
      u1: { percentage: 60, amount: 510, paid: true, paidAt: '2026-05-01' },
      u2: { percentage: 40, amount: 340, paid: true, paidAt: '2026-05-01' },
    },
  },
  {
    id: 'b10',
    title: 'Electricity Bill',
    category: 'utilities',
    totalAmount: 95,
    dueDate: '2026-05-24',
    recurrence: 'monthly',
    splitType: 'equal',
    createdBy: 'u1',
    participantIds: ['u1', 'u2'],
    shares: {
      u1: { amount: 47.5, paid: true, paidAt: '2026-05-20' },
      u2: { amount: 47.5, paid: true, paidAt: '2026-05-20' },
    },
  },
]

export const taskRecurrenceOptions = ['none', 'daily', 'weekly', 'monthly']

export const mockTasks = [
  {
    id: 't1',
    title: 'Take out the trash',
    assigneeId: 'u2',
    recurrence: 'weekly',
    dueDate: '2026-07-20',
    notify: true,
    completed: false,
    completedBy: null,
    completedAt: null,
    createdBy: 'u1',
  },
  {
    id: 't2',
    title: 'Clean the kitchen',
    assigneeId: null,
    recurrence: 'daily',
    dueDate: null,
    notify: false,
    completed: false,
    completedBy: null,
    completedAt: null,
    createdBy: 'u1',
  },
  {
    id: 't3',
    title: 'Vacuum living room',
    assigneeId: 'u1',
    recurrence: 'weekly',
    dueDate: null,
    notify: true,
    completed: true,
    completedBy: 'u1',
    completedAt: '2026-07-15',
    createdBy: 'u1',
  },
  {
    id: 't4',
    title: 'Buy toilet paper',
    assigneeId: 'u2',
    recurrence: 'none',
    dueDate: null,
    notify: false,
    completed: true,
    completedBy: 'u2',
    completedAt: '2026-07-10',
    createdBy: 'u2',
  },
]

export const mockHallOfFame = []

export const mockShoppingItems = [
  {
    id: 's1',
    name: 'Toilet paper',
    addedBy: 'u2',
    createdAt: '2026-07-14',
    bought: false,
    boughtBy: null,
    boughtAt: null,
    price: null,
    billId: null,
  },
  {
    id: 's2',
    name: 'Dish soap',
    addedBy: 'u1',
    createdAt: '2026-07-15',
    bought: false,
    boughtBy: null,
    boughtAt: null,
    price: null,
    billId: null,
  },
  {
    id: 's3',
    name: 'Milk',
    addedBy: 'u1',
    createdAt: '2026-07-10',
    bought: true,
    boughtBy: 'u2',
    boughtAt: '2026-07-11',
    price: 6.5,
    billId: null,
  },
]

export const mockVault = {
  wifi: { name: 'SunnyHouse_5G', password: 'SunnyDays2026!' },
  memberPayments: {
    u1: { payId: 'alex.silva@example.com', bankDetails: 'BSB 062-000 · Acc 1234 5678' },
    u2: { payId: '0412 345 678', bankDetails: 'BSB 083-004 · Acc 9876 5432' },
  },
  customFields: [
    { id: 'f1', label: 'Landlord phone', value: '+61 400 123 456' },
    { id: 'f2', label: 'Storage unit code', value: '4471' },
  ],
}
