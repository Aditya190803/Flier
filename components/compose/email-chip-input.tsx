"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";

import { Copy, Pencil, Trash2, X } from "lucide-react";

import { parseEmailList, serializeEmailList } from "@/lib/email/parse-list";
import { cn } from "@/lib/utils";
import { isValidEmail } from "@/lib/validation";

function avatarTone(email: string): string {
  const tones = [
    "bg-blue-600 text-white",
    "bg-emerald-600 text-white",
    "bg-violet-600 text-white",
    "bg-amber-600 text-white",
    "bg-rose-600 text-white",
    "bg-cyan-700 text-white",
    "bg-indigo-600 text-white",
  ];
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = (hash + email.charCodeAt(i) * (i + 1)) % tones.length;
  }
  return tones[hash] ?? tones[0];
}

function labelFor(email: string): string {
  const local = email.split("@")[0] || email;
  return local
    .replace(/[._+-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

type ChipMenu = { email: string; x: number; y: number };

export function EmailChipInput({
  id,
  value,
  onChange,
  placeholder = "Add email…",
  className,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [menu, setMenu] = useState<ChipMenu | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const emails = useMemo(() => parseEmailList(value), [value]);

  useEffect(() => {
    if (!menu) {
      return;
    }
    const close = (e: Event) => {
      if (menuRef.current?.contains(e.target as Node)) {
        return;
      }
      setMenu(null);
    };
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenu(null);
      }
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  const commit = (raw: string) => {
    const next = raw
      .trim()
      .toLowerCase()
      .replace(/[,;]+$/, "");
    if (!next) {
      return;
    }
    if (!isValidEmail(next)) {
      setError(`Invalid email: ${next}`);
      return;
    }
    if (emails.includes(next)) {
      setDraft("");
      setError(null);
      return;
    }
    onChange(serializeEmailList([...emails, next]));
    setDraft("");
    setError(null);
  };

  const remove = (email: string) => {
    onChange(serializeEmailList(emails.filter((e) => e !== email)));
    inputRef.current?.focus();
  };

  const startEdit = (email: string) => {
    onChange(serializeEmailList(emails.filter((e) => e !== email)));
    setDraft(email);
    setError(null);
    setMenu(null);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  };

  const copyEmail = async (email: string) => {
    try {
      await navigator.clipboard.writeText(email);
    } catch {
      // ignore clipboard failures
    }
    setMenu(null);
  };

  const openMenu = (e: MouseEvent, email: string) => {
    e.preventDefault();
    e.stopPropagation();
    setMenu({ email, x: e.clientX, y: e.clientY });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "," || e.key === ";" || e.key === "Tab") {
      if (draft.trim()) {
        e.preventDefault();
        commit(draft);
      }
      return;
    }
    if (e.key === "Backspace" && !draft && emails.length > 0) {
      remove(emails[emails.length - 1]);
    }
  };

  return (
    <div className={cn("flex-1 min-w-0", className)}>
      <div
        className="flex flex-wrap items-center gap-1.5 min-h-8 w-full cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {emails.map((email) => (
          <span
            key={email}
            className="inline-flex items-center gap-1.5 max-w-full rounded-full border bg-muted/50 pl-0.5 pr-1 py-0.5 text-sm select-none"
            title={email}
            onContextMenu={(e) => openMenu(e, email)}
            onDoubleClick={(e) => {
              e.stopPropagation();
              startEdit(email);
            }}
          >
            <span
              className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
                avatarTone(email),
              )}
              aria-hidden
            >
              {(labelFor(email)[0] || email[0] || "?").toUpperCase()}
            </span>
            <span className="truncate max-w-[12rem]">{labelFor(email)}</span>
            <button
              type="button"
              onClick={(ev) => {
                ev.stopPropagation();
                remove(email);
              }}
              className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label={`Remove ${email}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          id={id}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            if (error) {
              setError(null);
            }
          }}
          onKeyDown={onKeyDown}
          onBlur={() => {
            if (draft.trim()) {
              commit(draft);
            }
          }}
          onPaste={(e) => {
            const text = e.clipboardData.getData("text");
            if (/[,;\s]/.test(text)) {
              e.preventDefault();
              const parts = parseEmailList(`${draft} ${text}`);
              const valid = parts.filter(isValidEmail);
              const invalid = parts.filter((p) => !isValidEmail(p));
              if (valid.length) {
                onChange(serializeEmailList([...new Set([...emails, ...valid])]));
              }
              setDraft("");
              setError(invalid.length ? `Skipped invalid: ${invalid[0]}` : null);
            }
          }}
          placeholder={emails.length === 0 ? placeholder : ""}
          className="flex-1 min-w-[8rem] bg-transparent border-0 outline-none shadow-none text-sm py-0.5 placeholder:text-muted-foreground"
          autoComplete="email"
          inputMode="email"
        />
      </div>
      {error ? <p className="text-[11px] text-destructive mt-1">{error}</p> : null}

      {menu ? (
        <div
          ref={menuRef}
          role="menu"
          className="fixed z-50 min-w-[11rem] rounded-xl border bg-popover p-1 text-popover-foreground shadow-lg"
          style={{ left: menu.x, top: menu.y }}
        >
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted"
            onClick={() => copyEmail(menu.email)}
          >
            <Copy className="h-3.5 w-3.5 text-muted-foreground" />
            Copy email
          </button>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted"
            onClick={() => startEdit(menu.email)}
          >
            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
            Edit
          </button>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
            onClick={() => {
              remove(menu.email);
              setMenu(null);
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remove
          </button>
        </div>
      ) : null}
    </div>
  );
}
