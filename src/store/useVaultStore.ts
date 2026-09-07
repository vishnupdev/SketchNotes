"use client";

import { create } from "zustand";
import { sGet, sSet } from "@/lib/storage";
import { uid } from "@/lib/utils";
import {
  createKey,
  isVaultBlob,
  open,
  seal,
  unlockKey,
  type VaultBlob,
  type VaultKey,
} from "@/lib/Vault/crypto";
import type { TotpConfig } from "@/lib/Vault/totp";
import {
  PASSPHRASE_DEFAULTS,
  PASSWORD_DEFAULTS,
  type PassphraseOptions,
  type PasswordOptions,
} from "@/lib/Vault/generate";

/** The encrypted vault. One blob: see `lib/Vault/crypto.ts` for why. */
const VAULT_KEY = "sknotes:vault:data";
/** Generator settings. Not secret, and useless without the vault. */
const PREFS_KEY = "sknotes:vault:prefs";

export type VaultTool = "codes" | "generate" | "notes";

export const VAULT_TOOLS: VaultTool[] = ["codes", "generate", "notes"];

/** Whether there is a vault, and whether it is open. */
export type VaultStatus = "empty" | "locked" | "open";

export interface Account extends TotpConfig {
  id: string;
  added: number;
}

export interface SecretNote {
  id: string;
  title: string;
  body: string;
  updated: number;
}

/** What the encrypted blob decrypts to. */
interface VaultContents {
  accounts: Account[];
  notes: SecretNote[];
}

interface VaultState {
  tool: VaultTool;
  status: VaultStatus;
  /** Set while a key is being derived — it takes the better part of a second. */
  working: boolean;
  /** Why the last unlock or save failed, for the form to show. */
  error: string | null;

  accounts: Account[];
  notes: SecretNote[];

  password: PasswordOptions;
  passphrase: PassphraseOptions;

  setTool: (tool: VaultTool) => void;
  hydrate: () => Promise<void>;
  create: (passphrase: string) => Promise<boolean>;
  unlock: (passphrase: string) => Promise<boolean>;
  lock: () => void;
  /** Throw the vault away — the only way past a forgotten passphrase. */
  destroy: () => Promise<void>;

  addAccount: (config: TotpConfig) => Promise<void>;
  removeAccount: (id: string) => Promise<void>;
  saveNote: (note: Pick<SecretNote, "title" | "body"> & { id?: string }) => Promise<void>;
  removeNote: (id: string) => Promise<void>;

  setPassword: (options: Partial<PasswordOptions>) => void;
  setPassphrase: (options: Partial<PassphraseOptions>) => void;
}

/**
 * The derived key, held **outside** the store.
 *
 * Zustand state is read by React, logged by devtools and serialised by anything
 * that walks it. The key never being part of it is deliberate: it lives in this
 * module-scoped variable, is cleared by `lock()`, and cannot be reached from a
 * component. What the store exposes is only whether the vault is open.
 */
let vaultKey: VaultKey | null = null;

const readBlob = async (): Promise<VaultBlob | null> => {
  const raw = await sGet(VAULT_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return isVaultBlob(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

/**
 * Vault's state.
 *
 * Every mutation re-seals the whole vault and writes it, because the encrypted
 * unit *is* the whole vault — there is no way to update one entry inside an
 * AES-GCM ciphertext, and pretending otherwise would mean one blob per entry,
 * which leaks how many entries you have and how long their names are.
 */
export const useVaultStore = create<VaultState>((set, get) => ({
  tool: "codes",
  status: "empty",
  working: false,
  error: null,
  accounts: [],
  notes: [],
  password: PASSWORD_DEFAULTS,
  passphrase: PASSPHRASE_DEFAULTS,

  setTool: (tool) => {
    set({ tool, error: null });
    void persistPrefs(get());
  },

  hydrate: async () => {
    const raw = await sGet(PREFS_KEY);
    if (raw) {
      try {
        const prefs = JSON.parse(raw) as {
          tool?: VaultTool;
          password?: PasswordOptions;
          passphrase?: PassphraseOptions;
        };
        set({
          tool: VAULT_TOOLS.includes(prefs.tool as VaultTool) ? (prefs.tool as VaultTool) : "codes",
          password: { ...PASSWORD_DEFAULTS, ...prefs.password },
          passphrase: { ...PASSPHRASE_DEFAULTS, ...prefs.passphrase },
        });
      } catch {
        /* corrupt prefs are simply the defaults */
      }
    }

    // A vault is always found locked, however it was left. Nothing survives a
    // reload but the ciphertext.
    set({ status: (await readBlob()) ? "locked" : "empty", accounts: [], notes: [] });
  },

  create: async (passphrase) => {
    if (passphrase.length < 8) {
      set({ error: "Use at least eight characters — this is the only thing protecting it." });
      return false;
    }

    set({ working: true, error: null });
    try {
      vaultKey = await createKey(passphrase);
      const contents: VaultContents = { accounts: [], notes: [] };
      await sSet(VAULT_KEY, JSON.stringify(await seal(vaultKey, contents)));
      set({ status: "open", accounts: [], notes: [], working: false });
      return true;
    } catch {
      vaultKey = null;
      set({ working: false, error: "This browser would not create the key." });
      return false;
    }
  },

  unlock: async (passphrase) => {
    const blob = await readBlob();
    if (!blob) {
      set({ status: "empty" });
      return false;
    }

    set({ working: true, error: null });
    try {
      const key = await unlockKey(passphrase, blob);
      // The authentication tag fails on a wrong passphrase, which is what
      // makes this answerable at all — see `lib/Vault/crypto.ts`.
      const contents = await open<VaultContents>(key, blob);
      vaultKey = key;
      set({
        status: "open",
        accounts: Array.isArray(contents.accounts) ? contents.accounts : [],
        notes: Array.isArray(contents.notes) ? contents.notes : [],
        working: false,
      });
      return true;
    } catch {
      vaultKey = null;
      set({ working: false, error: "That is not the passphrase for this vault." });
      return false;
    }
  },

  lock: () => {
    // Dropping the key is what locking *is*. Clearing the entries as well means
    // nothing decrypted is left in memory for the next reader.
    vaultKey = null;
    set({ status: "locked", accounts: [], notes: [], error: null });
  },

  destroy: async () => {
    vaultKey = null;
    await sSet(VAULT_KEY, "");
    set({ status: "empty", accounts: [], notes: [], error: null });
  },

  addAccount: async (config) => {
    const account: Account = { ...config, id: uid(), added: Date.now() };
    set({ accounts: [...get().accounts, account] });
    await save(get());
  },

  removeAccount: async (id) => {
    set({ accounts: get().accounts.filter((account) => account.id !== id) });
    await save(get());
  },

  saveNote: async (note) => {
    const now = Date.now();
    const existing = note.id ? get().notes.find((item) => item.id === note.id) : undefined;
    const next: SecretNote = {
      id: existing?.id ?? uid(),
      title: note.title.trim() === "" ? "Untitled" : note.title.trim(),
      body: note.body,
      updated: now,
    };
    set({
      notes: existing
        ? get().notes.map((item) => (item.id === next.id ? next : item))
        : [next, ...get().notes],
    });
    await save(get());
  },

  removeNote: async (id) => {
    set({ notes: get().notes.filter((note) => note.id !== id) });
    await save(get());
  },

  setPassword: (options) => {
    set({ password: { ...get().password, ...options } });
    void persistPrefs(get());
  },

  setPassphrase: (options) => {
    set({ passphrase: { ...get().passphrase, ...options } });
    void persistPrefs(get());
  },
}));

/** Re-seal and write. A closed vault silently writes nothing. */
async function save(state: VaultState): Promise<void> {
  if (!vaultKey) return;
  const contents: VaultContents = { accounts: state.accounts, notes: state.notes };
  try {
    await sSet(VAULT_KEY, JSON.stringify(await seal(vaultKey, contents)));
  } catch {
    useVaultStore.setState({ error: "The vault could not be written to this browser's storage." });
  }
}

const persistPrefs = (state: VaultState): Promise<void> =>
  sSet(
    PREFS_KEY,
    JSON.stringify({
      tool: state.tool,
      password: state.password,
      passphrase: state.passphrase,
    }),
  );
