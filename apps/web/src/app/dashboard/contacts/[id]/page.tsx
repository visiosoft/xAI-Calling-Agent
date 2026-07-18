"use client";

import { useState, useRef } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Plus, Upload, MoreVertical, Pencil, Trash2 } from "lucide-react";
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

interface Contact {
  id: string;
  phoneNumber: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  customFields: Record<string, string> | null;
  doNotCall: boolean;
}

interface ContactList {
  id: string;
  name: string;
  description: string | null;
  contactCount: number;
}

export default function ContactListDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [phone, setPhone] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [page, setPage] = useState(1);

  const [editContact, setEditContact] = useState<Contact | null>(null);
  const [editPhone, setEditPhone] = useState("");
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [deleteContact, setDeleteContact] = useState<Contact | null>(null);

  const { data: list } = useQuery({
    queryKey: ["contact-list", id],
    queryFn: () => api.get<ContactList>(`/api/contact-lists/${id}`),
  });

  const { data: contactsData, isLoading } = useQuery({
    queryKey: ["contacts", id, page],
    queryFn: () =>
      api.get<{ contacts: Contact[]; total: number }>(
        `/api/contact-lists/${id}/contacts?page=${page}&limit=20`
      ),
  });

  const addMutation = useMutation({
    mutationFn: (data: any) =>
      api.post(`/api/contact-lists/${id}/contacts`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts", id] });
      queryClient.invalidateQueries({ queryKey: ["contact-list", id] });
      setShowAdd(false);
      setPhone("");
      setFirstName("");
      setLastName("");
      setEmail("");
    },
  });

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return api.post(`/api/contact-lists/${id}/import`, formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts", id] });
      queryClient.invalidateQueries({ queryKey: ["contact-list", id] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ contactId, data }: { contactId: string; data: any }) =>
      api.patch(`/api/contacts/${contactId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts", id] });
      setEditContact(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (contactId: string) => api.delete(`/api/contacts/${contactId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts", id] });
      queryClient.invalidateQueries({ queryKey: ["contact-list", id] });
      setDeleteContact(null);
    },
  });

  function openEdit(contact: Contact) {
    setEditPhone(contact.phoneNumber);
    setEditFirstName(contact.firstName || "");
    setEditLastName(contact.lastName || "");
    setEditEmail(contact.email || "");
    setEditContact(contact);
  }

  const totalPages = Math.ceil((contactsData?.total ?? 0) / 20);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {list?.name || "..."}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {list?.contactCount ?? 0} contacts
            {list?.description ? ` — ${list.description}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted"
          >
            <Upload className="h-4 w-4" /> Import CSV
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) importMutation.mutate(file);
            }}
          />
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> Add Contact
          </button>
        </div>
      </div>

      {importMutation.isSuccess && (
        <div className="mb-4 p-3 bg-success/10 text-success rounded-lg text-sm">
          CSV imported successfully!
        </div>
      )}

      {showAdd && (
        <div className="mb-6 p-6 rounded-xl border border-border bg-card">
          <h3 className="font-semibold mb-4">Add Contact</h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              addMutation.mutate({
                phoneNumber: phone,
                firstName: firstName || undefined,
                lastName: lastName || undefined,
                email: email || undefined,
              });
            }}
            className="grid grid-cols-2 gap-3"
          >
            <input
              placeholder="Phone (+1234567890)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              className="px-3 py-2 border border-border rounded-lg bg-background text-foreground"
            />
            <input
              placeholder="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="px-3 py-2 border border-border rounded-lg bg-background text-foreground"
            />
            <input
              placeholder="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="px-3 py-2 border border-border rounded-lg bg-background text-foreground"
            />
            <input
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="px-3 py-2 border border-border rounded-lg bg-background text-foreground"
            />
            <div className="col-span-2 flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="px-4 py-2 border border-border rounded-lg text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                Name
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                Phone
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                Email
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                Status
              </th>
              <th className="px-4 py-3 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  Loading...
                </td>
              </tr>
            ) : !contactsData?.contacts?.length ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No contacts yet
                </td>
              </tr>
            ) : (
              contactsData.contacts.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 text-foreground">
                    {[c.firstName, c.lastName].filter(Boolean).join(" ") || "—"}
                  </td>
                  <td className="px-4 py-3 text-foreground font-mono">
                    {c.phoneNumber}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {c.email || "—"}
                  </td>
                  <td className="px-4 py-3">
                    {c.doNotCall ? (
                      <span className="text-xs px-2 py-1 bg-destructive/10 text-destructive rounded">
                        DNC
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-1 bg-success/10 text-success rounded">
                        Active
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground">
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(c)}>
                          <Pencil className="h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          destructive
                          onClick={() => setDeleteContact(c)}
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1 border border-border rounded text-sm disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-3 py-1 text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1 border border-border rounded text-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {/* Edit Contact Dialog */}
      <Dialog open={!!editContact} onOpenChange={() => setEditContact(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Contact</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (editContact) {
                updateMutation.mutate({
                  contactId: editContact.id,
                  data: {
                    phoneNumber: editPhone,
                    firstName: editFirstName || undefined,
                    lastName: editLastName || undefined,
                    email: editEmail || undefined,
                  },
                });
              }
            }}
            className="space-y-3"
          >
            <div>
              <label className="text-sm font-medium text-foreground">Phone</label>
              <input
                type="text"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                required
                className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background text-foreground"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-foreground">First Name</label>
                <input
                  type="text"
                  value={editFirstName}
                  onChange={(e) => setEditFirstName(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Last Name</label>
                <input
                  type="text"
                  value={editLastName}
                  onChange={(e) => setEditLastName(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Email</label>
              <input
                type="text"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background text-foreground"
              />
            </div>
            <DialogFooter>
              <button
                type="button"
                onClick={() => setEditContact(null)}
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

      {/* Delete Contact Dialog */}
      <Dialog open={!!deleteContact} onOpenChange={() => setDeleteContact(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Contact</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              {[deleteContact?.firstName, deleteContact?.lastName].filter(Boolean).join(" ") || deleteContact?.phoneNumber}?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              onClick={() => setDeleteContact(null)}
              className="px-4 py-2 border border-border rounded-lg text-sm text-foreground hover:bg-muted"
            >
              Cancel
            </button>
            <button
              onClick={() => deleteContact && deleteMutation.mutate(deleteContact.id)}
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
