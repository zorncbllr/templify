"use client";

import { useState, useCallback, useEffect } from "react";
import { GOOGLE_FONTS, FONT_CATS } from "../types/constants";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { IconChevronDown } from "@/components/Icons";

export function FontPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (f: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [cat, setCat] = useState("All");

  const loadFont = useCallback((name: string) => {
    const id = `gf-${name.replace(/\s+/g, "-")}`;
    if (!document.getElementById(id)) {
      const l = document.createElement("link");
      l.id = id;
      l.rel = "stylesheet";
      l.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(name)}:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap`;
      document.head.appendChild(l);
    }
  }, []);

  useEffect(() => {
    loadFont(value);
  }, [value, loadFont]);

  const filtered =
    cat === "All"
      ? GOOGLE_FONTS
      : GOOGLE_FONTS.filter((f) => f.category === cat);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="w-full px-2 rounded-md bg-[rgba(255,255,255,0.05)] text-[#f0ede8] text-xs py-2 flex items-center justify-between cursor-pointer outline-none"
          style={{
            border: `1px solid ${open ? "rgba(232,255,71,0.4)" : "rgba(255,255,255,0.1)"}`,
            fontFamily: `'${value}',serif`,
          }}
        >
          <span className="overflow-hidden text-ellipsis whitespace-nowrap">
            {value}
          </span>
          <IconChevronDown
            style={{ opacity: 0.4, flexShrink: 0, marginLeft: 4 }}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[220px] p-0 dark"
        align="start"
        sideOffset={4}
      >
        <Command
          filter={(value, search) => {
            if (value.toLowerCase().includes(search.toLowerCase())) return 1;
            return 0;
          }}
        >
          <CommandInput
            placeholder="Search fonts..."
            className="h-8 text-[11px]"
          />

          <div className="flex gap-1 px-2 py-1.5 flex-wrap">
            {FONT_CATS.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className="px-1.5 py-0.5 rounded text-[9px] font-semibold border-none cursor-pointer"
                style={{
                  background:
                    cat === c
                      ? "rgba(232,255,71,0.15)"
                      : "rgba(255,255,255,0.05)",
                  color: cat === c ? "#e8ff47" : "rgba(240,237,232,0.4)",
                }}
              >
                {c}
              </button>
            ))}
          </div>

          <CommandList className="max-h-[180px]">
            <CommandEmpty className="py-3 text-[11px]">
              No fonts found
            </CommandEmpty>
            <CommandGroup>
              {filtered.map((f) => {
                loadFont(f.name);
                return (
                  <CommandItem
                    key={f.name}
                    value={f.name}
                    onSelect={() => {
                      onChange(f.name);
                      setOpen(false);
                    }}
                    className="flex items-center justify-between px-2 py-1.5 cursor-pointer"
                  >
                    <span
                      style={{ fontFamily: `'${f.name}',serif` }}
                      className={`text-xs ${value === f.name ? "font-medium" : ""}`}
                    >
                      {f.name}
                    </span>
                    <span className="text-[9px] opacity-30 font-[DM_Sans,sans-serif]">
                      {f.category}
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
