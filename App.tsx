
import React, { useState, useCallback } from 'react';
import Header from './components/Header';
import FileUpload from './components/FileUpload';
import ReconciliationView from './components/ReconciliationView';
import Spinner from './components/Spinner';
import { ReconciliationResult, StatementType } from './types';
import { reconcileStatements } from './services/geminiService';

const App: React.FC = () => {
  const [tallyFile, setTallyFile] = useState<File | null>(null);
  const [bankFile, setBankFile] = useState<File | null>(null);
  const [result, setResult] = useState<ReconciliationResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (file: File, type: StatementType) => {
    if (type === StatementType.Tally) {
      setTallyFile(file);
    } else {
      setBankFile(file);
    }
  };

  const handleReconcile = useCallback(async () => {
    if (!tallyFile || !bankFile) {
      setError('Please upload both Tally and Bank statements to proceed.');
      return;
    }
    setError(null);
    setIsLoading(true);
    setResult(null);

    try {
      const reconciliationResult = await reconcileStatements(tallyFile, bankFile);
      setResult(reconciliationResult);
    } catch (e: any) {
      setError(e.message || 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, [tallyFile, bankFile]);

  const handleReset = () => {
    setTallyFile(null);
    setBankFile(null);
    setResult(null);
    setError(null);
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-800">
      <Header />
      <main className="flex-grow">
        {isLoading && (
          <div className="fixed inset-0 bg-slate-900 bg-opacity-50 flex flex-col items-center justify-center z-50">
            <Spinner />
            <p className="text-white mt-4 text-lg">Analyzing documents, please wait...</p>
          </div>
        )}

        {result ? (
          <ReconciliationView result={result} onReset={handleReset} />
        ) : (
          <div className="w-full max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-slate-900">Effortless Reconciliation</h2>
              <p className="mt-2 text-lg text-slate-600">Upload your Tally and Bank statements to begin.</p>
            </div>
            
            {error && (
                <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-md" role="alert">
                    <p className="font-bold">Error</p>
                    <p>{error}</p>
                </div>
            )}

            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <FileUpload 
                title="1. Upload Tally Statement"
                onFileSelect={(file) => handleFileSelect(file, StatementType.Tally)}
                selectedFile={tallyFile}
              />
              <FileUpload
                title="2. Upload Bank Statement"
                onFileSelect={(file) => handleFileSelect(file, StatementType.Bank)}
                selectedFile={bankFile}
              />
            </div>

            <div className="text-center">
              <button
                onClick={handleReconcile}
                disabled={!tallyFile || !bankFile || isLoading}
                className="bg-blue-600 text-white font-bold py-3 px-8 rounded-lg text-lg hover:bg-blue-700 transition-all duration-300 disabled:bg-slate-400 disabled:cursor-not-allowed shadow-lg hover:shadow-xl disabled:shadow-none transform hover:-translate-y-0.5"
              >
                {isLoading ? 'Processing...' : 'Reconcile Now'}
              </button>
            </div>
          </div>
        )}
      </main>
       <footer className="w-full text-center py-4 text-slate-500 text-sm">
        <p>Powered by AI. Built for clarity and precision.</p>
      </footer>
    </div>
  );
};

export default App;
