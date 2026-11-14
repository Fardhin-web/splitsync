import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from './context/AuthContext';
import { api } from './services/api';
import Sidebar from './components/common/Sidebar';
import Header from './components/common/Header';
import SummaryCards from './components/dashboard/SummaryCards';
import ExpenseList from './components/expenses/ExpenseList';
import DebtSimplifierCard from './components/settle/DebtSimplifierCard';
import ExpenseModal from './components/expenses/ExpenseModal';
import SettleModal from './components/settle/SettleModal';
import NewGroupModal from './components/groups/NewGroupModal';
import AddMemberModal from './components/groups/AddMemberModal';
import AnalyticsView from './components/analytics/AnalyticsView';
import AuthModal from './components/auth/AuthModal';
import { Loader2 } from 'lucide-react';

export default function App() {
  const { isAuthenticated, isLoading: isAuthLoading, user } = useAuth();

  // Dark Mode State
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('splitsync_dark_mode');
    return saved !== null ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('splitsync_dark_mode', JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode(prev => !prev);

  // Group & View State
  const [groups, setGroups] = useState([]);
  const [currentGroup, setCurrentGroup] = useState(null);
  const [groupDetails, setGroupDetails] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'expenses' | 'settle' | 'analytics'
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoadingGroup, setIsLoadingGroup] = useState(false);

  // Modals State
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState(null);
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [initialTransferToSettle, setInitialTransferToSettle] = useState(null);
  const [isNewGroupModalOpen, setIsNewGroupModalOpen] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);

  // Load Groups List
  const loadGroups = useCallback(async () => {
    try {
      const res = await api.groups.list();
      setGroups(res.groups);
      if (res.groups.length > 0) {
        setCurrentGroup(prev => {
          const match = prev ? res.groups.find(g => g.id === prev.id) : null;
          return match || res.groups[0];
        });
      }
    } catch (err) {
      console.error('Failed to load groups:', err);
    }
  }, []);

  // Load Single Group Details
  const loadGroupDetails = useCallback(async (groupId) => {
    if (!groupId) return;
    try {
      setIsLoadingGroup(true);
      const res = await api.groups.get(groupId);
      setGroupDetails(res);
      setCurrentGroup(res.group);
    } catch (err) {
      console.error('Failed to load group details:', err);
    } finally {
      setIsLoadingGroup(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadGroups();
    }
  }, [isAuthenticated, loadGroups]);

  useEffect(() => {
    if (currentGroup?.id) {
      loadGroupDetails(currentGroup.id);
    }
  }, [currentGroup?.id, loadGroupDetails]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        setExpenseToEdit(null);
        setIsExpenseModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handlers for Modals
  const handleOpenNewExpense = () => {
    setExpenseToEdit(null);
    setIsExpenseModalOpen(true);
  };

  const handleEditExpense = (expense) => {
    setExpenseToEdit(expense);
    setIsExpenseModalOpen(true);
  };

  const handleOpenSettle = (transfer = null) => {
    setInitialTransferToSettle(transfer);
    setIsSettleModalOpen(true);
  };

  const handleGroupCreated = async (newGroup) => {
    await loadGroups();
    setCurrentGroup(newGroup);
  };

  const refreshCurrentGroup = () => {
    if (currentGroup?.id) {
      loadGroupDetails(currentGroup.id);
    }
    loadGroups();
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Loading SplitSync...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthModal />;
  }

  const currency = currentGroup?.currency || '₹';
  const expenses = groupDetails?.expenses || [];
  const debtSummary = groupDetails?.debtSummary || null;
  const members = currentGroup?.members || [];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex transition-colors">
      {/* Collapsible Left Sidebar */}
      <Sidebar
        groups={groups}
        currentGroup={currentGroup}
        onSelectGroup={(g) => setCurrentGroup(g)}
        onOpenNewGroup={() => setIsNewGroupModalOpen(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAddMember={() => setIsAddMemberModalOpen(true)}
        isDarkMode={isDarkMode}
        toggleDarkMode={toggleDarkMode}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Workspace */}
      <div className="flex-1 lg:pl-72 flex flex-col min-w-0">
        <Header
          currentGroup={currentGroup}
          onOpenNewExpense={handleOpenNewExpense}
          onOpenAddMember={() => setIsAddMemberModalOpen(true)}
          onOpenSettle={() => handleOpenSettle(null)}
          onToggleSidebar={() => setIsSidebarOpen(prev => !prev)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {isLoadingGroup && !groupDetails ? (
            <div className="space-y-4 animate-pulse">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 h-28 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
              <div className="h-96 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
            </div>
          ) : (
            <>
              {/* Top Summary Cards always present on Dashboard and Balances */}
              {(activeTab === 'dashboard' || activeTab === 'settle') && (
                <SummaryCards
                  group={currentGroup}
                  debtSummary={debtSummary}
                  currentUserId={user?.id}
                  onOpenSettle={() => handleOpenSettle(null)}
                />
              )}

              {/* View 1: Dashboard (Split View) */}
              {activeTab === 'dashboard' && (
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                  {/* Left: Recent Expenses Feed */}
                  <div className="xl:col-span-7 min-w-0">
                    <ExpenseList
                      expenses={expenses}
                      currency={currency}
                      currentUserId={user?.id}
                      onEditExpense={handleEditExpense}
                      onDeleted={refreshCurrentGroup}
                    />
                  </div>

                  {/* Right: Who Owes Whom (Debt Simplifier Engine Card) */}
                  <div className="xl:col-span-5 min-w-0 xl:sticky xl:top-20 xl:max-h-[calc(100vh-6rem)] xl:overflow-y-auto pr-0.5">
                    <DebtSimplifierCard
                      debtSummary={debtSummary}
                      currency={currency}
                      members={members}
                      onSettleTransfer={(transfer) => handleOpenSettle(transfer)}
                      isSidebar={true}
                    />
                  </div>
                </div>
              )}

              {/* View 2: Expenses Tab */}
              {activeTab === 'expenses' && (
                <ExpenseList
                  expenses={expenses}
                  currency={currency}
                  currentUserId={user?.id}
                  onEditExpense={handleEditExpense}
                  onDeleted={refreshCurrentGroup}
                />
              )}

              {/* View 3: Balances & Settle Tab */}
              {activeTab === 'settle' && (
                <DebtSimplifierCard
                  debtSummary={debtSummary}
                  currency={currency}
                  members={members}
                  onSettleTransfer={(transfer) => handleOpenSettle(transfer)}
                  isSidebar={false}
                />
              )}

              {/* View 4: Analytics & Budget Tab */}
              {activeTab === 'analytics' && (
                <AnalyticsView
                  groupId={currentGroup?.id}
                  currency={currency}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Global Modals */}
      <ExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        group={currentGroup}
        expenseToEdit={expenseToEdit}
        onSaved={refreshCurrentGroup}
      />

      <SettleModal
        isOpen={isSettleModalOpen}
        onClose={() => setIsSettleModalOpen(false)}
        group={currentGroup}
        initialTransfer={initialTransferToSettle}
        onSettled={refreshCurrentGroup}
      />

      <NewGroupModal
        isOpen={isNewGroupModalOpen}
        onClose={() => setIsNewGroupModalOpen(false)}
        onGroupCreated={handleGroupCreated}
      />

      <AddMemberModal
        isOpen={isAddMemberModalOpen}
        onClose={() => setIsAddMemberModalOpen(false)}
        group={currentGroup}
        onMemberAdded={refreshCurrentGroup}
      />
    </div>
  );
}
