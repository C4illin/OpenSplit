import { getRouteApi, Link } from "@tanstack/react-router";
import { ArrowLeft, Plus } from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";
import {
  useAddExpense,
  useAddPerson,
  useExpenses,
  useGroup,
  usePeople,
} from "../hooks/useApi";
import { calculateBalances, calculateSettlements } from "../lib/calculations";

const routeApi = getRouteApi("/group/$id");

function GroupDetailPage() {
  const { id } = routeApi.useParams();
  const { data: group } = useGroup(id);
  const { data: people = [] } = usePeople(id);
  const { data: expenses = [] } = useExpenses(id);
  const addPersonMutation = useAddPerson(id);
  const addExpenseMutation = useAddExpense(id);

  const [showAddPerson, setShowAddPerson] = useState(false);
  const [personName, setPersonName] = useState("");
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    description: "",
    amount: "",
    paidBy: "",
    splitAmong: [] as string[],
    date: new Date().toISOString().split("T")[0],
  });

  const peopleMap = useMemo(() => {
    const map = new Map();
    people.forEach((p) => map.set(p.id, p));
    return map;
  }, [people]);

  const balances = useMemo(
    () => calculateBalances(expenses, peopleMap),
    [expenses, peopleMap],
  );
  const settlements = useMemo(() => calculateSettlements(balances), [balances]);

  const handleAddPerson = async (e: React.FormEvent) => {
    e.preventDefault();
    await addPersonMutation.mutateAsync({ name: personName });
    setPersonName("");
    setShowAddPerson(false);
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    await addExpenseMutation.mutateAsync({
      ...expenseForm,
      amount: parseFloat(expenseForm.amount),
    });
    setExpenseForm({
      description: "",
      amount: "",
      paidBy: "",
      splitAmong: [],
      date: new Date().toISOString().split("T")[0],
    });
    setShowAddExpense(false);
  };

  const togglePersonInSplit = (personId: string) => {
    setExpenseForm({
      ...expenseForm,
      splitAmong: expenseForm.splitAmong.includes(personId)
        ? expenseForm.splitAmong.filter((id) => id !== personId)
        : [...expenseForm.splitAmong, personId],
    });
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 mb-6"
        >
          <ArrowLeft size={20} />
          Back
        </Link>

        <h1 className="text-4xl font-bold text-gray-800 mb-2">{group?.name}</h1>
        <p className="text-gray-600 mb-8">{group?.description}</p>

        {/* People Section */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold">People</h2>
            <button
              onClick={() => setShowAddPerson(!showAddPerson)}
              className="bg-indigo-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700"
            >
              <Plus size={20} />
              Add Person
            </button>
          </div>

          {showAddPerson && (
            <form onSubmit={handleAddPerson} className="mb-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Person name"
                  value={personName}
                  onChange={(e) => setPersonName(e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                  required
                />
                <button
                  type="submit"
                  disabled={addPersonMutation.isPending}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
                >
                  Add
                </button>
              </div>
            </form>
          )}

          <div className="space-y-2">
            {people.map((person) => {
              const balance = balances.find((b) => b.personId === person.id);
              return (
                <div
                  key={person.id}
                  className="flex justify-between items-center p-3 bg-gray-50 rounded"
                >
                  <span className="font-medium">{person.name}</span>
                  <span
                    className={`font-semibold ${(balance?.balance ?? 0) > 0
                        ? "text-green-600"
                        : "text-red-600"
                      }`}
                  >
                    {(balance?.balance ?? 0) > 0 ? "+" : ""}$
                    {(balance?.balance ?? 0).toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Expenses Section */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold">Expenses</h2>
            <button
              onClick={() => setShowAddExpense(!showAddExpense)}
              className="bg-indigo-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700"
            >
              <Plus size={20} />
              Add Expense
            </button>
          </div>

          {showAddExpense && people.length > 0 && (
            <form
              onSubmit={handleAddExpense}
              className="mb-6 p-4 bg-gray-50 rounded"
            >
              <input
                type="text"
                placeholder="Description"
                value={expenseForm.description}
                onChange={(e) =>
                  setExpenseForm({
                    ...expenseForm,
                    description: e.target.value,
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
                required
              />
              <input
                type="number"
                placeholder="Amount"
                step="0.01"
                value={expenseForm.amount}
                onChange={(e) =>
                  setExpenseForm({ ...expenseForm, amount: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
                required
              />
              <label className="block mb-4">
                <span className="block text-sm font-medium mb-2">Paid by:</span>
                <select
                  value={expenseForm.paidBy}
                  onChange={(e) =>
                    setExpenseForm({ ...expenseForm, paidBy: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  required
                >
                  <option value="">Select person</option>
                  {people.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block mb-4">
                <span className="block text-sm font-medium mb-2">
                  Split among:
                </span>
                <div className="space-y-2">
                  {people.map((p) => (
                    <label key={p.id} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={expenseForm.splitAmong.includes(p.id)}
                        onChange={() => togglePersonInSplit(p.id)}
                        className="mr-2"
                      />
                      {p.name}
                    </label>
                  ))}
                </div>
              </label>
              <input
                type="date"
                value={expenseForm.date}
                onChange={(e) =>
                  setExpenseForm({ ...expenseForm, date: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
                required
              />
              <button
                type="submit"
                disabled={addExpenseMutation.isPending}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
              >
                {addExpenseMutation.isPending ? "Adding..." : "Add Expense"}
              </button>
            </form>
          )}

          {people.length === 0 ? (
            <p className="text-gray-500">Add people to the group first</p>
          ) : (
            <div className="space-y-3">
              {expenses.map((expense) => (
                <div
                  key={expense.id}
                  className="p-4 border border-gray-200 rounded"
                >
                  <div className="flex justify-between mb-2">
                    <span className="font-medium">{expense.description}</span>
                    <span className="font-semibold">
                      ${expense.amount.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Paid by: {peopleMap.get(expense.paidBy)?.name}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Settlements Section */}
        {settlements.length > 0 && (
          <div className="bg-green-50 rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">Settlements</h2>
            <div className="space-y-2">
              {settlements.map((settlement, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-white rounded border border-green-200"
                >
                  <span className="font-medium">
                    {peopleMap.get(settlement.from)?.name}
                  </span>
                  {" pays "}
                  <span className="font-medium">
                    ${settlement.amount.toFixed(2)}
                  </span>
                  {" to "}
                  <span className="font-medium">
                    {peopleMap.get(settlement.to)?.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default GroupDetailPage;
