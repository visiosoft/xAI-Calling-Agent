import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Link } from "react-router-dom";
import { Plus, Users, MoreVertical, Pencil, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface ContactList {
  id: string;
  name: string;
  description: string | null;
  contactCount: number;
  createdAt: string;
}

export function ContactsPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [editList, setEditList] = useState<ContactList | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [deleteList, setDeleteList] = useState<ContactList | null>(null);

  const { data: lists, isLoading } = useQuery({
    queryKey: ["contact-lists"],
    queryFn: async () => {
      const res = await api.get<{ lists: ContactList[] }>("/api/contact-lists");
      return res.lists;
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      api.post("/api/contact-lists", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact-lists"] });
      setShowCreate(false);
      setNewName("");
      setNewDesc("");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name: string; description?: string } }) =>
      api.patch(`/api/contact-lists/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact-lists"] });
      setEditList(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/contact-lists/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact-lists"] });
      setDeleteList(null);
    },
  });

  function openEdit(list: ContactList) {
    setEditName(list.name);
    setEditDesc(list.description || "");
    setEditList(list);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-foreground">Contact Lists</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> Create List
        </button>
      </div>

      {showCreate && (
        <div className="mb-6 p-6 rounded-xl border border-border bg-card">
          <h3 className="font-semibold text-card-foreground mb-4">
            New Contact List
          </h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate({
                name: newName,
                description: newDesc || undefined,
              });
            }}
            className="space-y-3"
          >
            <input
              type="text"
              placeholder="List name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
            />
            <input
              type="text"
              placeholder="Description (optional)"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 border border-border rounded-lg text-sm text-foreground"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : !lists?.length ? (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No contact lists yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {lists.map((list) => (
            <div
              key={list.id}
              className="p-6 rounded-xl border border-border bg-card hover:border-primary/50 transition-colors relative"
            >
              <div className="absolute top-3 right-3">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground">
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEdit(list)}>
                      <Pencil className="h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      destructive
                      onClick={() => setDeleteList(list)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <Link
                to={`/dashboard/contacts/${list.id}`}
                className="block pr-8"
              >
                <h3 className="font-semibold text-card-foreground hover:text-primary">
                  {list.name}
                </h3>
                {list.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {list.description}
                  </p>
                )}
                <p className="text-sm text-muted-foreground mt-3">
                  {list.contactCount} contacts
                </p>
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editList} onOpenChange={() => setEditList(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Contact List</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (editList) {
                updateMutation.mutate({
                  id: editList.id,
                  data: { name: editName, description: editDesc || undefined },
                });
              }
            }}
            className="space-y-3"
          >
            <div>
              <label className="text-sm font-medium text-foreground">Name</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
                className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background text-foreground"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Description</label>
              <input
                type="text"
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background text-foreground"
              />
            </div>
            <DialogFooter>
              <button
                type="button"
                onClick={() => setEditList(null)}
                className="px-4 py-2 border border-border rounded-lg text-sm text-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updateMutation.isPending}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
              >
                {updateMutation.isPending ? "Saving..." : "Save"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleteList} onOpenChange={() => setDeleteList(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Contact List</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{deleteList?.name}&rdquo;? All {deleteList?.contactCount} contacts in this list will also be deleted. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              onClick={() => setDeleteList(null)}
              className="px-4 py-2 border border-border rounded-lg text-sm text-foreground hover:bg-muted"
            >
              Cancel
            </button>
            <button
              onClick={() => deleteList && deleteMutation.mutate(deleteList.id)}
              disabled={deleteMutation.isPending}
              className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
