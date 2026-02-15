import { Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { useCreateGroup, useGroups } from "../hooks/useApi";

function GroupsPage() {
  const { data: groups, isLoading } = useGroups();
  const createGroupMutation = useCreateGroup();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: "", description: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createGroupMutation.mutateAsync(formData);
    setFormData({ name: "", description: "" });
    setShowForm(false);
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800">OpenSplit</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700"
          >
            <Plus size={20} />
            New Group
          </button>
        </div>

        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-lg shadow-lg p-6 mb-8"
          >
            <input
              type="text"
              placeholder="Group name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
              required
            />
            <textarea
              placeholder="Description (optional)"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
            />
            <button
              type="submit"
              disabled={createGroupMutation.isPending}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
            >
              {createGroupMutation.isPending ? "Creating..." : "Create Group"}
            </button>
          </form>
        )}

        {isLoading ? (
          <p>Loading groups...</p>
        ) : groups && groups.length > 0 ? (
          <div className="grid gap-4">
            {groups.map((group) => (
              <Link
                key={group.id}
                to="/group/$id"
                params={{
                  id: group.id,
                }}
                className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow"
              >
                <h2 className="text-2xl font-semibold text-gray-800">
                  {group.name}
                </h2>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500">
            No groups yet. Create one to get started!
          </p>
        )}
      </div>
    </div>
  );
}

export default GroupsPage;
