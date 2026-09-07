"use client";

import { useEffect } from "react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { useVaultStore, VAULT_TOOLS, type VaultTool } from "@/store/useVaultStore";
import { LockPanel } from "@/components/Vault/organisms/LockPanel";
import { CodesPanel } from "@/components/Vault/organisms/CodesPanel";
import { GeneratePanel } from "@/components/Vault/organisms/GeneratePanel";
import { NotesPanel } from "@/components/Vault/organisms/NotesPanel";
import { NavView } from "@/components/SketchNotes/atoms/NavView";
import { AppBrand } from "@/components/SketchNotes/molecules/AppBrand";
import { AppFooter } from "@/components/SketchNotes/molecules/AppFooter";
import { BottomNav, type BottomNavItem } from "@/components/SketchNotes/molecules/BottomNav";
import {
  AppsIcon,
  CodeRingIcon,
  DiceIcon,
  KeyIcon,
  LockIcon,
  ShieldIcon,
} from "@/components/SketchNotes/atoms/icons";

const TABS: BottomNavItem<VaultTool>[] = [
  {
    id: "codes",
    label: "Codes",
    hint: "Two-factor codes, counting down",
    icon: <CodeRingIcon size={19} />,
  },
  {
    id: "generate",
    label: "Generate",
    hint: "A password or a passphrase, with its real strength",
    icon: <DiceIcon size={19} />,
  },
  {
    id: "notes",
    label: "Notes",
    hint: "Recovery codes and keys, encrypted",
    icon: <ShieldIcon size={19} />,
  },
];

/**
 * Vault — the three jobs around a password, on a device that keeps no copy.
 *
 * The workspace had nothing for credentials, which is the one category where
 * "it never leaves your browser" stops being a nicety and becomes the entire
 * argument. A hosted authenticator has to be trusted with the seed that *is*
 * your second factor; this one derives the codes locally from a secret sealed
 * under your own passphrase, and works with the network unplugged — which is
 * exactly when you need a code.
 *
 * Three tabs, and the middle one is the only part that works while locked:
 * generating a password reads nothing and writes nothing, so there is no reason
 * to make someone unlock a vault to get one.
 */
export function VaultApp() {
  const openLauncher = useWorkspaceStore((s) => s.openLauncher);
  const tool = useVaultStore((s) => s.tool);
  const setTool = useVaultStore((s) => s.setTool);
  const status = useVaultStore((s) => s.status);
  const lock = useVaultStore((s) => s.lock);
  const hydrate = useVaultStore((s) => s.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  // Locking on the way out is the point of a lock. Leaving the key in memory
  // for whoever opens the tab next would make the passphrase decorative.
  useEffect(() => () => lock(), [lock]);

  const open = status === "open";
  // The generator needs no vault, so it stays available while locked.
  const showLock = !open && tool !== "generate";

  /**
   * `aria-controls` goes on the current tab only.
   *
   * The panel a tab controls has to *exist*, and only one does: a locked vault
   * shows the lock screen where its codes and notes panels would be. Declaring
   * it on all three would point two of them at nothing — which is invalid ARIA
   * and tells a screen reader about panels the page does not have.
   */
  const tabs = TABS.map((tab) =>
    tab.id === tool
      ? { ...tab, controls: showLock ? "vault-panel-lock" : `vault-panel-${tool}` }
      : tab,
  );

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-paper px-[22px] pb-[18px] pt-[22px]">
        <div className="mx-auto flex max-w-[760px] flex-wrap items-end justify-between gap-4">
          <AppBrand
            icon={<KeyIcon size={24} />}
            name="Vault"
            tagline="codes and secrets, sealed on this device"
            onLeave={lock}
          />

          <div className="flex items-center gap-2">
            {open && (
              <button
                type="button"
                onClick={lock}
                className="tint inline-flex items-center gap-2 rounded-full border border-border bg-panel px-3.5 py-2 font-mono text-[11px] uppercase tracking-[.1em] hover:border-accent hover:text-accent"
              >
                <LockIcon size={15} />
                Lock
              </button>
            )}
            <button
              type="button"
              onClick={openLauncher}
              title="Switch app"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-panel px-3.5 py-2 font-mono text-[11px] uppercase tracking-[.1em] hover:border-accent hover:text-accent"
            >
              <AppsIcon size={15} />
              Apps
            </button>
          </div>
        </div>
      </header>

      <main className="bottom-nav-clear mx-auto w-full max-w-[760px] flex-1 px-5 pt-[22px]">
        {showLock ? (
          <div id="vault-panel-lock" role="tabpanel">
            <LockPanel />
          </div>
        ) : (
          <NavView viewKey={tool} order={VAULT_TOOLS} id={`vault-panel-${tool}`} role="tabpanel">
            {tool === "codes" ? (
              <CodesPanel />
            ) : tool === "generate" ? (
              <GeneratePanel />
            ) : (
              <NotesPanel />
            )}
          </NavView>
        )}
      </main>

      <BottomNav label="Vault tools" items={tabs} value={tool} onChange={setTool} maxWidth={360} />

      <AppFooter />
    </div>
  );
}
