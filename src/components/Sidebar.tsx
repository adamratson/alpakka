import { useState } from "react";

interface SidebarProps {
  lists: { id: string; title: string }[];
  activeListId: string;
  sharedListId?: string;
  onSwitch: (id: string) => void;
  onCreate: () => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
}

export default function Sidebar({
  lists,
  activeListId,
  sharedListId,
  onSwitch,
  onCreate,
  onRename,
  onDelete,
}: SidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function startEdit(id: string, title: string) {
    setEditingId(id);
    setEditTitle(title);
  }

  function confirmEdit(id: string) {
    if (editTitle.trim()) {
      onRename(id, editTitle.trim());
    }
    setEditingId(null);
  }

  function confirmDelete(id: string) {
    onDelete(id);
    setDeletingId(null);
  }

  return (
    <aside className="sidebar">
      <div className="sidebar__lists">
        {lists.map((list) => (
          <div key={list.id} className="sidebar__item-wrapper">
            {editingId === list.id ? (
              <input
                type="text"
                className="sidebar__edit-input"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={() => confirmEdit(list.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") confirmEdit(list.id);
                  if (e.key === "Escape") setEditingId(null);
                }}
                autoFocus
              />
            ) : (
              <button
                className={`sidebar__item ${
                  list.id === activeListId ? "sidebar__item--active" : ""
                }`}
                onClick={() => onSwitch(list.id)}
                onDoubleClick={() => startEdit(list.id, list.title)}
              >
                {list.id === sharedListId && (
                  <span
                    className="sidebar__shared-dot"
                    aria-label="Shared with another peer"
                    title="Shared with another peer"
                  >
                    ●
                  </span>
                )}
                {list.title}
              </button>
            )}

            {deletingId === list.id ? (
              <div className="sidebar__delete-confirm">
                <span className="sidebar__delete-label">Delete list?</span>
                <button
                  className="sidebar__delete-btn sidebar__delete-btn--confirm"
                  onClick={() => confirmDelete(list.id)}
                >
                  Delete
                </button>
                <button
                  className="sidebar__delete-btn sidebar__delete-btn--cancel"
                  onClick={() => setDeletingId(null)}
                >
                  Cancel
                </button>
              </div>
            ) : (
              lists.length > 1 && (
                <button
                  className="sidebar__delete-icon"
                  title="Delete list"
                  onClick={() => setDeletingId(list.id)}
                  aria-label="Delete list"
                >
                  ×
                </button>
              )
            )}
          </div>
        ))}
      </div>

      <button className="sidebar__new-btn" onClick={onCreate}>
        + New list
      </button>
    </aside>
  );
}
