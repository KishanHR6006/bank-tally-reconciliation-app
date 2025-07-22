# bank-tally-reconciliation-app
import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle, XCircle, AlertCircle, Search, Filter, Plus, Edit, CornerDownRight, Eye,
  LayoutDashboard, Banknote, ReceiptText, GitPullRequestDraft, TrendingUp, TrendingDown,
  Calendar, DollarSign, ListFilter, UploadCloud
} from 'lucide-react'; // Using lucide-react for Apple-like icons

// Mock Data Generation Utility
const generateMockTransactions = (type, count, startId) => {
  const transactions = [];
  const baseDate = new Date('2024-07-01T09:00:00Z');
  const descriptions = [
    "Salary Deposit", "Office Supplies Purchase", "Travel Expenses", "Utility Bill Payment",
    "Client Payment", "Rent Payment", "Software Subscription", "Consulting Fee",
    "Miscellaneous Expense", "Refund Received", "Loan Repayment", "Investment Income",
    "Student Fees - Term 1", "Tuition Fee Payment", "School Supplies Purchase",
    "Sports Equipment", "Maintenance Charges", "Bus Fee Collection", "Exam Fee",
    "Donation Received", "Teacher Salary", "Electricity Bill", "Water Bill"
  ];
  const categories = ["Income", "Expense", "Transfer"];

  for (let i = 0; i < count; i++) {
    const id = `${type.toUpperCase()}-${startId + i}`;
    const amount = parseFloat((Math.random() * 5000 + 100).toFixed(2));
    const date = new Date(baseDate.getTime() + Math.random() * 30 * 24 * 60 * 60 * 1000); // Within 30 days
    const description = descriptions[Math.floor(Math.random() * descriptions.length)];
    const category = categories[Math.floor(Math.random() * categories.length)];
    const reference = `REF${Math.floor(Math.random() * 1000000)}`;

    transactions.push({
      id,
      amount,
      date: date.toISOString().split('T')[0], // YYYY-MM-DD
      description,
      category,
      reference,
      status: 'unreconciled', // Initial status
      isFlagged: Math.random() < 0.1, // Simulate AI anomaly detection
      suggestedMatchId: null, // For predictive suggestions
    });
  }
  return transactions;
};

// Initial Mock Data
const initialBankStatements = generateMockTransactions('bank', 20, 1000);
const initialTallyEntries = generateMockTransactions('tally', 20, 2000);

// Introduce some mismatches and missing entries for demonstration
// Bank has an entry Tally doesn't
initialBankStatements.push({
  id: 'BANK-1021', amount: 750.00, date: '2024-07-15', description: 'Unknown Deposit', category: 'Income', reference: 'UNKN-789', status: 'unreconciled', isFlagged: false, suggestedMatchId: null
});
// Tally has an entry Bank doesn't
initialTallyEntries.push({
  id: 'TALLY-2021', amount: 1200.00, date: '2024-07-18', description: 'Vendor Payment Pending', category: 'Expense', reference: 'VNDR-456', status: 'unreconciled', isFlagged: false, suggestedMatchId: null
});
// Amount mismatch
initialBankStatements.push({
  id: 'BANK-1022', amount: 300.00, date: '2024-07-20', description: 'Software License', category: 'Expense', reference: 'SWL-001', status: 'unreconciled', isFlagged: false, suggestedMatchId: null
});
initialTallyEntries.push({
  id: 'TALLY-2022', amount: 305.00, date: '2024-07-20', description: 'Software License', category: 'Expense', reference: 'SWL-001', status: 'unreconciled', isFlagged: false, suggestedMatchId: null
});
// Date mismatch (minor)
initialBankStatements.push({
  id: 'BANK-1023', amount: 500.00, date: '2024-07-22', description: 'Consulting Fee', category: 'Income', reference: 'CONS-005', status: 'unreconciled', isFlagged: false, suggestedMatchId: null
});
initialTallyEntries.push({
  id: 'TALLY-2023', amount: 500.00, date: '2024-07-23', description: 'Consulting Fee', category: 'Income', reference: 'CONS-005', status: 'unreconciled', isFlagged: false, suggestedMatchId: null
});
// One-to-many (Bank has one, Tally has two small ones)
initialBankStatements.push({
  id: 'BANK-1024', amount: 1000.00, date: '2024-07-25', description: 'Bulk Purchase', category: 'Expense', reference: 'BULK-001', status: 'unreconciled', isFlagged: false, suggestedMatchId: null
});
initialTallyEntries.push({
  id: 'TALLY-2024', amount: 600.00, date: '2024-07-25', description: 'Item A', category: 'Expense', reference: 'BULK-001A', status: 'unreconciled', isFlagged: false, suggestedMatchId: null
});
initialTallyEntries.push({
  id: 'TALLY-2025', amount: 400.00, date: '2024-07-25', description: 'Item B', category: 'Expense', reference: 'BULK-001B', status: 'unreconciled', isFlagged: false, suggestedMatchId: null
});


// Main App Component
const App = () => {
  const [bankStatements, setBankStatements] = useState(initialBankStatements);
  const [tallyEntries, setTallyEntries] = useState(initialTallyEntries);
  const [reconciledTransactions, setReconciledTransactions] = useState([]);
  const [unreconciledBank, setUnreconciledBank] = useState([]);
  const [unreconciledTally, setUnreconciledTally] = useState([]);
  const [discrepancies, setDiscrepancies] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('Current Month');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all', 'unreconciled', 'mismatch', 'missing'
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState({});
  const [selectedBankItem, setSelectedBankItem] = useState(null);
  const [selectedTallyItem, setSelectedTallyItem] = useState(null);

  // Reconciliation Logic
  const performReconciliation = useCallback(() => {
    let tempReconciled = [];
    let tempUnreconciledBank = [...bankStatements];
    let tempUnreconciledTally = [...tallyEntries];
    let tempDiscrepancies = [];

    // Step 1: Exact Matches (Amount, Date, Description/Reference)
    tempUnreconciledBank = tempUnreconciledBank.filter(bankTxn => {
      const matchedTallyIndex = tempUnreconciledTally.findIndex(tallyTxn =>
        tallyTxn.amount === bankTxn.amount &&
        tallyTxn.date === bankTxn.date &&
        (tallyTxn.description === bankTxn.description || tallyTxn.reference === bankTxn.reference)
      );

      if (matchedTallyIndex !== -1) {
        const matchedTallyTxn = tempUnreconciledTally[matchedTallyIndex];
        tempReconciled.push({
          bank: { ...bankTxn, status: 'reconciled' },
          tally: { ...matchedTallyTxn, status: 'reconciled' },
          type: 'Exact Match'
        });
        tempUnreconciledTally.splice(matchedTallyIndex, 1); // Remove from unreconciled Tally
        return false; // Remove from unreconciled Bank
      }
      return true; // Keep in unreconciled Bank
    });

    // Step 2: Amount Mismatches (Same description/reference, close date, different amount)
    tempUnreconciledBank = tempUnreconciledBank.filter(bankTxn => {
      const matchedTallyIndex = tempUnreconciledTally.findIndex(tallyTxn =>
        Math.abs(tallyTxn.amount - bankTxn.amount) <= 5 && // 5 unit tolerance
        Math.abs(new Date(tallyTxn.date) - new Date(bankTxn.date)) <= (24 * 60 * 60 * 1000) && // 1 day tolerance
        (tallyTxn.description === bankTxn.description || tallyTxn.reference === bankTxn.reference)
      );

      if (matchedTallyIndex !== -1) {
        const matchedTallyTxn = tempUnreconciledTally[matchedTallyIndex];
        tempDiscrepancies.push({
          type: 'Amount Mismatch',
          bank: bankTxn,
          tally: matchedTallyTxn,
          id: `DISC-AMT-${bankTxn.id}-${matchedTallyTxn.id}`
        });
        tempUnreconciledTally.splice(matchedTallyIndex, 1);
        return false;
      }
      return true;
    });

    // Step 3: Date Mismatches (Same amount, same description/reference, different date)
    tempUnreconciledBank = tempUnreconciledBank.filter(bankTxn => {
      const matchedTallyIndex = tempUnreconciledTally.findIndex(tallyTxn =>
        tallyTxn.amount === bankTxn.amount &&
        Math.abs(new Date(tallyTxn.date) - new Date(bankTxn.date)) <= (3 * 24 * 60 * 60 * 1000) && // 3 day tolerance
        (tallyTxn.description === bankTxn.description || tallyTxn.reference === bankTxn.reference)
      );

      if (matchedTallyIndex !== -1) {
        const matchedTallyTxn = tempUnreconciledTally[matchedTallyIndex];
        tempDiscrepancies.push({
          type: 'Date Mismatch',
          bank: bankTxn,
          tally: matchedTallyTxn,
          id: `DISC-DATE-${bankTxn.id}-${matchedTallyTxn.id}`
        });
        tempUnreconciledTally.splice(matchedTallyIndex, 1);
        return false;
      }
      return true;
    });

    // Step 4: Missing Entries
    tempUnreconciledBank.forEach(bankTxn => {
      tempDiscrepancies.push({
        type: 'Missing in Tally',
        bank: bankTxn,
        tally: null,
        id: `MISS-TALLY-${bankTxn.id}`
      });
    });
    tempUnreconciledTally.forEach(tallyTxn => {
      tempDiscrepancies.push({
        type: 'Missing in Bank',
        bank: null,
        tally: tallyTxn,
        id: `MISS-BANK-${tallyTxn.id}`
      });
    });

    setReconciledTransactions(tempReconciled);
    setUnreconciledBank(tempUnreconciledBank);
    setUnreconciledTally(tempUnreconciledTally);
    setDiscrepancies(tempDiscrepancies);
  }, [bankStatements, tallyEntries]);

  useEffect(() => {
    performReconciliation();
  }, [performReconciliation]);

  // Handlers for UI interactions
  const handleReconcile = (bankTxnId, tallyTxnId) => {
    // Find the bank and tally transactions
    const bankTxn = bankStatements.find(t => t.id === bankTxnId);
    const tallyTxn = tallyEntries.find(t => t.id === tallyTxnId);

    if (bankTxn && tallyTxn) {
      setReconciledTransactions(prev => [...prev, {
        bank: { ...bankTxn, status: 'reconciled' },
        tally: { ...tallyTxn, status: 'reconciled' },
        type: 'Manual Match'
      }]);

      // Remove from unreconciled lists and update main lists
      setBankStatements(prev => prev.map(t => t.id === bankTxnId ? { ...t, status: 'reconciled' } : t));
      setTallyEntries(prev => prev.map(t => t.id === tallyTxnId ? { ...t, status: 'reconciled' } : t));
      setUnreconciledBank(prev => prev.filter(t => t.id !== bankTxnId));
      setUnreconciledTally(prev => prev.filter(t => t.id !== tallyTxnId));
      setDiscrepancies(prev => prev.filter(d =>
        !(d.bank?.id === bankTxnId && d.tally?.id === tallyTxnId) &&
        !(d.bank?.id === bankTxnId && d.tally === null) &&
        !(d.tally?.id === tallyTxnId && d.bank === null)
      ));
      setSelectedBankItem(null);
      setSelectedTallyItem(null);
      setShowModal(false);
    }
  };

  const showResolutionOptions = (bankTxn, tallyTxn, discrepancyType) => {
    setModalContent({
      title: 'Resolve Discrepancy',
      bank: bankTxn,
      tally: tallyTxn,
      type: discrepancyType,
      message: `Review and choose an action for this ${discrepancyType}.`,
      actions: [
        { label: 'Mark as Reconciled', handler: () => handleReconcile(bankTxn?.id, tallyTxn?.id), icon: CheckCircle, primary: true },
        { label: 'Adjust Tally Entry', handler: () => console.log('Adjust Tally', tallyTxn?.id), icon: Edit },
        { label: 'Add Missing Entry', handler: () => console.log('Add Missing', bankTxn?.id || tallyTxn?.id), icon: Plus },
        { label: 'Split/Merge', handler: () => console.log('Split/Merge', bankTxn?.id, tallyTxn?.id), icon: GitPullRequestDraft },
        { label: 'Ignore/Note', handler: () => console.log('Ignore/Note', bankTxn?.id, tallyTxn?.id), icon: Eye },
      ]
    });
    setShowModal(true);
  };

  const handleItemClick = (type, item) => {
    if (type === 'bank') {
      setSelectedBankItem(item);
      // If a Tally item is already selected, try to suggest a match or show resolution
      if (selectedTallyItem) {
        if (item.amount === selectedTallyItem.amount && item.date === selectedTallyItem.date) {
          showResolutionOptions(item, selectedTallyItem, 'Manual Match');
        } else {
          showResolutionOptions(item, selectedTallyItem, 'Potential Mismatch');
        }
      }
    } else {
      setSelectedTallyItem(item);
      // If a Bank item is already selected, try to suggest a match or show resolution
      if (selectedBankItem) {
        if (item.amount === selectedBankItem.amount && item.date === selectedBankItem.date) {
          showResolutionOptions(selectedBankItem, item, 'Manual Match');
        } else {
          showResolutionOptions(selectedBankItem, item, 'Potential Mismatch');
        }
      }
    }
  };

  // Handler for file upload
  const handleFileUpload = (event, type) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target.result;
        // In a real application, you would parse the Excel/CSV data here.
        // For demonstration, we'll just log it and provide a mock update.
        console.log(`Uploaded ${type} file content:`, text.substring(0, 200) + '...'); // Log first 200 chars

        // Simulate parsing and updating state with new mock data
        const newTransactions = generateMockTransactions(type, 15, type === 'bank' ? 5000 : 6000);
        if (type === 'bank') {
          setBankStatements(newTransactions);
        } else {
          setTallyEntries(newTransactions);
        }
        alert(`Successfully uploaded and processed mock ${type} data from ${file.name}. (Actual parsing logic would go here)`);
      };
      reader.readAsText(file); // For CSV, use readAsText. For Excel, you'd need a library like 'xlsx'.
    }
  };


  const filteredBankStatements = bankStatements.filter(tx => {
    const matchesSearch = searchTerm === '' ||
      tx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.amount.toString().includes(searchTerm);
    const matchesFilter = filterType === 'all' ||
      (filterType === 'unreconciled' && tx.status === 'unreconciled') ||
      (filterType === 'flagged' && tx.isFlagged);
    return matchesSearch && matchesFilter;
  });

  const filteredTallyEntries = tallyEntries.filter(tx => {
    const matchesSearch = searchTerm === '' ||
      tx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.amount.toString().includes(searchTerm);
    const matchesFilter = filterType === 'all' ||
      (filterType === 'unreconciled' && tx.status === 'unreconciled') ||
      (filterType === 'flagged' && tx.isFlagged);
    return matchesSearch && matchesFilter;
  });

  const getStatusIcon = (status) => {
    switch (status) {
      case 'reconciled': return <CheckCircle className="text-green-500 w-4 h-4" />;
      case 'unreconciled': return <XCircle className="text-red-500 w-4 h-4" />;
      case 'partially-reconciled': return <AlertCircle className="text-yellow-500 w-4 h-4" />;
      default: return null;
    }
  };

  const getDiscrepancyIcon = (type) => {
    switch (type) {
      case 'Missing in Tally': return <TrendingUp className="text-red-500 w-4 h-4" />;
      case 'Missing in Bank': return <TrendingDown className="text-red-500 w-4 h-4" />;
      case 'Amount Mismatch': return <DollarSign className="text-orange-500 w-4 h-4" />;
      case 'Date Mismatch': return <Calendar className="text-blue-500 w-4 h-4" />;
      default: return <AlertCircle className="text-gray-500 w-4 h-4" />;
    }
  };

  const totalBank = bankStatements.length;
  const totalTally = tallyEntries.length;
  const totalReconciled = reconciledTransactions.length;
  const totalUnreconciled = unreconciledBank.length + unreconciledTally.length;
  const totalDiscrepancies = discrepancies.length;

  const reconciliationProgress = totalBank > 0 ? (totalReconciled / totalBank) * 100 : 0;

  return (
    <div className="min-h-screen bg-gray-50 font-inter text-gray-800 p-6 flex flex-col items-center">
      {/* Header */}
      <header className="w-full max-w-7xl bg-white rounded-xl shadow-lg p-6 mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 flex flex-col items-start">
          <span className="flex items-center">
            <Banknote className="mr-3 text-indigo-600" size={32} />
            Reconciliation Hub
          </span>
          <span className="text-base font-normal text-gray-500 mt-1">For School Financials</span>
        </h1>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-500">Period: <span className="font-semibold text-gray-700">{selectedPeriod}</span></span>
          <button className="flex items-center px-4 py-2 bg-indigo-500 text-white rounded-lg shadow hover:bg-indigo-600 transition-colors">
            <Plus className="w-4 h-4 mr-2" /> New Reconciliation
          </button>
        </div>
      </header>

      {/* Dashboard Overview */}
      <section className="w-full max-w-7xl grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-md p-5 flex flex-col items-start">
          <LayoutDashboard className="text-indigo-500 mb-3" size={24} />
          <h3 className="text-lg font-semibold text-gray-700 mb-1">Total Transactions</h3>
          <p className="text-3xl font-bold text-gray-900">{totalBank + totalTally}</p>
        </div>
        <div className="bg-white rounded-xl shadow-md p-5 flex flex-col items-start">
          <CheckCircle className="text-green-500 mb-3" size={24} />
          <h3 className="text-lg font-semibold text-gray-700 mb-1">Reconciled</h3>
          <p className="text-3xl font-bold text-gray-900">{totalReconciled}</p>
        </div>
        <div className="bg-white rounded-xl shadow-md p-5 flex flex-col items-start">
          <XCircle className="text-red-500 mb-3" size={24} />
          <h3 className="text-lg font-semibold text-gray-700 mb-1">Unreconciled</h3>
          <p className="text-3xl font-bold text-gray-900">{totalUnreconciled}</p>
        </div>
        <div className="bg-white rounded-xl shadow-md p-5 flex flex-col items-start">
          <AlertCircle className="text-yellow-500 mb-3" size={24} />
          <h3 className="text-lg font-semibold text-gray-700 mb-1">Discrepancies</h3>
          <p className="text-3xl font-bold text-gray-900">{totalDiscrepancies}</p>
        </div>
      </section>

      {/* Main Reconciliation Workspace */}
      <div className="w-full max-w-7xl bg-white rounded-xl shadow-lg p-6 flex flex-col lg:flex-row gap-6">
        {/* Left Column: Bank Statement */}
        <div className="flex-1 border border-gray-200 rounded-lg p-4">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center justify-between">
            <span className="flex items-center"><Banknote className="mr-2 text-green-600" size={20} /> Bank Statement</span>
            <label htmlFor="bank-upload" className="cursor-pointer flex items-center text-sm px-3 py-1 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
              <UploadCloud className="w-4 h-4 mr-1" /> Upload Excel
              <input
                id="bank-upload"
                type="file"
                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                className="hidden"
                onChange={(e) => handleFileUpload(e, 'bank')}
              />
            </label>
          </h2>
          <div className="relative mb-4">
            <input
              type="text"
              placeholder="Search bank transactions..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          </div>
          <div className="flex space-x-2 mb-4">
            <button
              className={`px-3 py-1 text-sm rounded-full ${filterType === 'all' ? 'bg-indigo-100 text-indigo-700 font-semibold' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              onClick={() => setFilterType('all')}
            >
              All
            </button>
            <button
              className={`px-3 py-1 text-sm rounded-full ${filterType === 'unreconciled' ? 'bg-indigo-100 text-indigo-700 font-semibold' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              onClick={() => setFilterType('unreconciled')}
            >
              Unreconciled
            </button>
            <button
              className={`px-3 py-1 text-sm rounded-full ${filterType === 'flagged' ? 'bg-indigo-100 text-indigo-700 font-semibold' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              onClick={() => setFilterType('flagged')}
            >
              Flagged (AI)
            </button>
          </div>
          <div className="h-[500px] overflow-y-auto custom-scrollbar pr-2">
            {filteredBankStatements.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No bank transactions found.</p>
            ) : (
              filteredBankStatements.map(tx => (
                <div
                  key={tx.id}
                  className={`bg-gray-50 p-3 mb-2 rounded-lg shadow-sm border border-gray-100 cursor-pointer transition-all duration-200 ease-in-out
                    ${tx.status === 'reconciled' ? 'opacity-60 bg-green-50 border-green-200' : ''}
                    ${tx.isFlagged ? 'border-red-400 bg-red-50' : ''}
                    ${selectedBankItem?.id === tx.id ? 'border-indigo-500 ring-2 ring-indigo-200' : ''}
                    hover:shadow-md`}
                  onClick={() => handleItemClick('bank', tx)}
                >
                  <div className="flex justify-between items-center text-sm font-medium">
                    <span className="text-gray-700">{tx.description}</span>
                    <span className={`font-bold ${tx.category === 'Income' ? 'text-green-600' : 'text-red-600'}`}>
                      {tx.category === 'Income' ? '+' : '-'} ₹{tx.amount.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-gray-500 mt-1">
                    <span>{tx.date}</span>
                    <span className="flex items-center">
                      {tx.isFlagged && <AlertCircle className="w-3 h-3 text-red-500 mr-1" />}
                      {getStatusIcon(tx.status)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Tally Entries */}
        <div className="flex-1 border border-gray-200 rounded-lg p-4">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center justify-between">
            <span className="flex items-center"><ReceiptText className="mr-2 text-purple-600" size={20} /> Tally Entries</span>
            <label htmlFor="tally-upload" className="cursor-pointer flex items-center text-sm px-3 py-1 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
              <UploadCloud className="w-4 h-4 mr-1" /> Upload Excel
              <input
                id="tally-upload"
                type="file"
                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                className="hidden"
                onChange={(e) => handleFileUpload(e, 'tally')}
              />
            </label>
          </h2>
          <div className="relative mb-4">
            <input
              type="text"
              placeholder="Search Tally entries..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          </div>
          <div className="flex space-x-2 mb-4">
            <button
              className={`px-3 py-1 text-sm rounded-full ${filterType === 'all' ? 'bg-purple-100 text-purple-700 font-semibold' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              onClick={() => setFilterType('all')}
            >
              All
            </button>
            <button
              className={`px-3 py-1 text-sm rounded-full ${filterType === 'unreconciled' ? 'bg-purple-100 text-purple-700 font-semibold' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              onClick={() => setFilterType('unreconciled')}
            >
              Unreconciled
            </button>
            <button
              className={`px-3 py-1 text-sm rounded-full ${filterType === 'flagged' ? 'bg-purple-100 text-purple-700 font-semibold' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              onClick={() => setFilterType('flagged')}
            >
              Flagged (AI)
            </button>
          </div>
          <div className="h-[500px] overflow-y-auto custom-scrollbar pr-2">
            {filteredTallyEntries.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No Tally entries found.</p>
            ) : (
              filteredTallyEntries.map(tx => (
                <div
                  key={tx.id}
                  className={`bg-gray-50 p-3 mb-2 rounded-lg shadow-sm border border-gray-100 cursor-pointer transition-all duration-200 ease-in-out
                    ${tx.status === 'reconciled' ? 'opacity-60 bg-green-50 border-green-200' : ''}
                    ${tx.isFlagged ? 'border-red-400 bg-red-50' : ''}
                    ${selectedTallyItem?.id === tx.id ? 'border-purple-500 ring-2 ring-purple-200' : ''}
                    hover:shadow-md`}
                  onClick={() => handleItemClick('tally', tx)}
                >
                  <div className="flex justify-between items-center text-sm font-medium">
                    <span className="text-gray-700">{tx.description}</span>
                    <span className={`font-bold ${tx.category === 'Income' ? 'text-green-600' : 'text-red-600'}`}>
                      {tx.category === 'Income' ? '+' : '-'} ₹{tx.amount.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-gray-500 mt-1">
                    <span>{tx.date}</span>
                    <span className="flex items-center">
                      {tx.isFlagged && <AlertCircle className="w-3 h-3 text-red-500 mr-1" />}
                      {getStatusIcon(tx.status)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Gap Analysis Panel */}
        <div className="lg:w-1/3 border border-gray-200 rounded-lg p-4 bg-gray-50 flex flex-col">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            <ListFilter className="mr-2 text-orange-600" size={20} /> Gap Analysis
          </h2>
          <div className="flex-grow overflow-y-auto custom-scrollbar pr-2">
            {discrepancies.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No discrepancies found. Great job!</p>
            ) : (
              discrepancies.map(disc => (
                <div
                  key={disc.id}
                  className="bg-white p-3 mb-3 rounded-lg shadow-sm border border-orange-100 flex items-start space-x-3"
                >
                  <div className="flex-shrink-0 mt-1">
                    {getDiscrepancyIcon(disc.type)}
                  </div>
                  <div className="flex-grow">
                    <h4 className="font-semibold text-gray-800 text-sm mb-1">{disc.type}</h4>
                    {disc.bank && (
                      <p className="text-xs text-gray-600">
                        <span className="font-medium text-indigo-600">Bank:</span> {disc.bank.description} (₹{disc.bank.amount.toFixed(2)}) - {disc.bank.date}
                      </p>
                    )}
                    {disc.tally && (
                      <p className="text-xs text-gray-600">
                        <span className="font-medium text-purple-600">Tally:</span> {disc.tally.description} (₹{disc.tally.amount.toFixed(2)}) - {disc.tally.date}
                      </p>
                    )}
                    <button
                      className="mt-2 text-xs text-indigo-600 hover:underline flex items-center"
                      onClick={() => showResolutionOptions(disc.bank, disc.tally, disc.type)}
                    >
                      Resolve <CornerDownRight className="w-3 h-3 ml-1" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Custom Modal for Resolution */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md animate-fade-in-up">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <AlertCircle className="text-indigo-500 mr-2" size={24} /> {modalContent.title}
            </h3>
            <p className="text-gray-700 mb-4">{modalContent.message}</p>

            {(modalContent.bank || modalContent.tally) && (
              <div className="mb-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                {modalContent.bank && (
                  <div className="mb-2">
                    <p className="font-semibold text-indigo-600 flex items-center"><Banknote className="w-4 h-4 mr-1" /> Bank Entry:</p>
                    <p className="text-sm text-gray-800 ml-5">{modalContent.bank.description} - ₹{modalContent.bank.amount.toFixed(2)} ({modalContent.bank.date})</p>
                  </div>
                )}
                {modalContent.tally && (
                  <div>
                    <p className="font-semibold text-purple-600 flex items-center"><ReceiptText className="w-4 h-4 mr-1" /> Tally Entry:</p>
                    <p className="text-sm text-gray-800 ml-5">{modalContent.tally.description} - ₹{modalContent.tally.amount.toFixed(2)} ({modalContent.tally.date})</p>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-3 justify-end">
              {modalContent.actions.map((action, index) => (
                <button
                  key={index}
                  className={`flex items-center px-4 py-2 rounded-lg shadow-md transition-all duration-200 ease-in-out
                    ${action.primary ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}
                  `}
                  onClick={action.handler}
                >
                  {action.icon && React.createElement(action.icon, { className: "w-4 h-4 mr-2" })}
                  {action.label}
                </button>
              ))}
              <button
                className="flex items-center px-4 py-2 rounded-lg shadow-md bg-red-500 text-white hover:bg-red-600 transition-all duration-200 ease-in-out"
                onClick={() => {
                  setShowModal(false);
                  setSelectedBankItem(null);
                  setSelectedTallyItem(null);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tailwind CSS CDN and custom scrollbar style */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        body {
          font-family: 'Inter', sans-serif;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #888;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #555;
        }
        @keyframes fadeInScale {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fade-in-up {
          animation: fadeInScale 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default App;
