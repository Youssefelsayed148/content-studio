"use client";

import { useState } from "react";
import Image from "next/image";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useBrand } from "@/context/brand-context";
import { Building2, Check, ChevronDown, Plus, Settings2 } from "lucide-react";
import Link from "next/link";

export function BrandSwitcher() {
  const { brands, activeBrand, setActiveBrand } = useBrand();
  const [open, setOpen] = useState(false);

  if (!activeBrand) return null;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-10 gap-2.5 px-3 rounded-xl glass border-white/[0.06] hover:bg-white/[0.05] hover:border-white/[0.1] pressable"
        >
          <BrandAvatar brand={activeBrand} size="sm" />
          <span className="text-sm font-semibold hidden sm:inline-block max-w-[140px] truncate">
            {activeBrand.name}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        className="w-72 glass-strong rounded-2xl border-white/[0.08] p-2"
        sideOffset={8}
      >
        {/* Header */}
        <div className="px-3 py-2">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            Workspaces
          </p>
        </div>

        {/* Brand List */}
        <div className="space-y-0.5">
          {brands.map((brand) => {
            const isActive = brand.id === activeBrand.id;
            return (
              <DropdownMenuItem
                key={brand.id}
                onClick={() => {
                  setActiveBrand(brand);
                  setOpen(false);
                }}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 cursor-pointer transition-all duration-200 ${
                  isActive
                    ? "bg-white/[0.08] border border-white/[0.08]"
                    : "hover:bg-white/[0.04] border border-transparent"
                }`}
              >
                <BrandAvatar brand={brand} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{brand.name}</span>
                    {isActive && (
                      <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    )}
                  </div>
                  {brand.description && (
                    <p className="text-[11px] text-muted-foreground truncate">{brand.description}</p>
                  )}
                </div>
              </DropdownMenuItem>
            );
          })}
        </div>

        <DropdownMenuSeparator className="my-2 bg-white/[0.06]" />

        {/* Actions */}
        <div className="space-y-0.5">
          <DropdownMenuItem asChild>
            <Link
              href="/configs"
              className="flex items-center gap-2.5 rounded-xl px-3 py-2 cursor-pointer hover:bg-white/[0.04] transition-colors"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04] border border-white/[0.06]">
                <Settings2 className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <span className="text-sm">Manage Workspaces</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link
              href="/configs"
              className="flex items-center gap-2.5 rounded-xl px-3 py-2 cursor-pointer hover:bg-white/[0.04] transition-colors"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04] border border-white/[0.06]">
                <Plus className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <span className="text-sm">Add Workspace</span>
            </Link>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function BrandAvatar({ brand, size }: { brand: { name: string; logoUrl: string; primaryColor: string }; size: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "h-6 w-6 text-[10px]",
    md: "h-8 w-8 text-xs",
    lg: "h-10 w-10 text-sm",
  };

  // If it's Divido, show the SVG logo
  if (brand.name.toLowerCase().includes("divido")) {
    return (
      <div
        className={`${sizeClasses[size]} flex items-center justify-center rounded-lg overflow-hidden shrink-0`}
        style={{ backgroundColor: brand.primaryColor || "#1a1a1a" }}
      >
        <DividoLogo className={size === "sm" ? "h-4 w-4" : size === "md" ? "h-5 w-5" : "h-6 w-6"} />
      </div>
    );
  }

  // If logo URL exists, show image
  if (brand.logoUrl) {
    return (
      <div className={`${sizeClasses[size]} relative rounded-lg overflow-hidden shrink-0`}>
        <Image
          src={brand.logoUrl}
          alt={brand.name}
          fill
          className="object-cover"
        />
      </div>
    );
  }

  // Fallback: colored circle with initials
  const initials = brand.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className={`${sizeClasses[size]} flex items-center justify-center rounded-lg font-bold shrink-0`}
      style={{
        backgroundColor: `${brand.primaryColor}20`,
        color: brand.primaryColor,
        border: `1px solid ${brand.primaryColor}30`,
      }}
    >
      {initials}
    </div>
  );
}

function DividoLogo({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* DIVIDO wordmark - stylized bold text */}
      <text
        x="0"
        y="30"
        fill="white"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="900"
        fontSize="28"
        letterSpacing="-0.5"
      >
        DIVIDO
      </text>
      {/* Orange slash accent */}
      <line
        x1="58"
        y1="5"
        x2="78"
        y2="35"
        stroke="#f97316"
        strokeWidth="5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export { BrandAvatar };
