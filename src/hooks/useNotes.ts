"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { NoteDocument, NoteMeta } from "@/engine/types";
import {
  KEY,
  deleteNote,
  fetchNote,
  fetchNotesIndex,
  saveNote,
  saveNotesIndex,
} from "@/lib/notes-api";
import { queryKeys } from "@/lib/query-keys";
import { itemPart, keyPart, moveToTrash } from "@/lib/trash";

/** Reactive notes index (the drawer list), newest-first. */
export function useNotesIndex() {
  return useQuery({
    queryKey: queryKeys.notesIndex,
    queryFn: fetchNotesIndex,
    staleTime: Infinity,
    select: (notes) => [...notes].sort((a, b) => b.updatedAt - a.updatedAt),
  });
}

export interface SaveNoteInput {
  id: string;
  doc: NoteDocument;
}

/**
 * All note write operations, colocated so they share one queryClient and keep
 * the index cache in sync. Each mutation returns the updated index so callers
 * can react without an extra fetch.
 */
export function useNoteMutations() {
  const qc = useQueryClient();

  const readIndex = () =>
    qc.getQueryData<NoteMeta[]>(queryKeys.notesIndex) ?? [];

  const persistIndex = async (next: NoteMeta[]) => {
    await saveNotesIndex(next);
    qc.setQueryData(queryKeys.notesIndex, next);
  };

  const save = useMutation({
    mutationFn: async ({ id, doc }: SaveNoteInput) => {
      await saveNote(id, doc);
      const index = readIndex();
      const next = index.map((n) =>
        n.id === id ? { ...n, title: doc.title, updatedAt: Date.now() } : n,
      );
      // A note being saved for the first time won't be in the index yet.
      if (!next.some((n) => n.id === id))
        next.unshift({ id, title: doc.title, updatedAt: Date.now() });
      await persistIndex(next);
      return next;
    },
  });

  const create = useMutation({
    mutationFn: async ({ id, doc }: SaveNoteInput) => {
      await saveNote(id, doc);
      const next: NoteMeta[] = [
        { id, title: doc.title, updatedAt: Date.now() },
        ...readIndex(),
      ];
      await persistIndex(next);
      qc.setQueryData(queryKeys.noteDetail(id), doc);
      return next;
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      /*
       * Captured before the delete, so a mis-tapped note is recoverable for a
       * month (Settings → Data → Recently deleted). A drawing is the one thing
       * in this workspace with no other copy anywhere, which is why it is the
       * delete that most needed a net under it.
       */
      const meta = readIndex().find((n) => n.id === id);
      const doc = await fetchNote(id);
      await moveToTrash({
        app: "sketchnotes",
        label: doc.title || meta?.title || "Untitled note",
        detail: `${doc.els.length} element${doc.els.length === 1 ? "" : "s"}`,
        parts: [
          keyPart(KEY.note(id), JSON.stringify(doc)),
          ...(meta ? [itemPart(KEY.index, meta)] : []),
        ],
      });

      await deleteNote(id);
      const next = readIndex().filter((n) => n.id !== id);
      await persistIndex(next);
      qc.removeQueries({ queryKey: queryKeys.noteDetail(id) });
      return next;
    },
  });

  return { save, create, remove };
}

/**
 * Imperatively load a note document through the query cache (deduped/cached).
 * Returned as a hook so callers get a stable function bound to the client.
 */
export function useLoadNote() {
  const qc = useQueryClient();
  return (id: string): Promise<NoteDocument> =>
    qc.fetchQuery({
      queryKey: queryKeys.noteDetail(id),
      queryFn: () => fetchNote(id),
      staleTime: 0,
    });
}
