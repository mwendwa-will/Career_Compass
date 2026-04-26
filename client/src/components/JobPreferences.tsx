import { useState, type KeyboardEvent } from "react";
import { MapPin, X, Briefcase, Building2, Home, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  AnalysisPreferences,
  EmploymentType,
  WorkArrangement,
} from "@/hooks/use-jobs";

interface JobPreferencesProps {
  value: AnalysisPreferences;
  onChange: (next: AnalysisPreferences) => void;
  disabled?: boolean;
}

const ARRANGEMENTS: { value: WorkArrangement; label: string; Icon: typeof Home }[] = [
  { value: "remote", label: "Remote", Icon: Home },
  { value: "hybrid", label: "Hybrid", Icon: Building2 },
  { value: "onsite", label: "On-site", Icon: Briefcase },
];

const EMPLOYMENT_TYPES: { value: EmploymentType; label: string }[] = [
  { value: "full-time", label: "Full-time" },
  { value: "part-time", label: "Part-time" },
  { value: "contract", label: "Contract" },
  { value: "freelance", label: "Freelance" },
  { value: "internship", label: "Internship" },
];

const LOCATION_SUGGESTIONS = [
  "Remote",
  "Nairobi",
  "London",
  "Berlin",
  "Lagos",
  "New York",
  "San Francisco",
  "Cape Town",
];

export function JobPreferences({ value, onChange, disabled }: JobPreferencesProps) {
  const [draft, setDraft] = useState("");

  const locations = value.locations ?? [];
  const arrangements = value.arrangements ?? [];
  const employmentTypes = value.employmentTypes ?? [];

  const addLocation = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    if (locations.some((l) => l.toLowerCase() === trimmed.toLowerCase())) return;
    onChange({ ...value, locations: [...locations, trimmed] });
    setDraft("");
  };

  const removeLocation = (loc: string) => {
    onChange({ ...value, locations: locations.filter((l) => l !== loc) });
  };

  const toggleArrangement = (arr: WorkArrangement) => {
    const next = arrangements.includes(arr)
      ? arrangements.filter((a) => a !== arr)
      : [...arrangements, arr];
    onChange({ ...value, arrangements: next });
  };

  const toggleEmployment = (emp: EmploymentType) => {
    const next = employmentTypes.includes(emp)
      ? employmentTypes.filter((e) => e !== emp)
      : [...employmentTypes, emp];
    onChange({ ...value, employmentTypes: next });
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addLocation(draft);
    } else if (e.key === "Backspace" && draft === "" && locations.length > 0) {
      e.preventDefault();
      removeLocation(locations[locations.length - 1]);
    }
  };

  const remainingSuggestions = LOCATION_SUGGESTIONS.filter(
    (s) => !locations.some((l) => l.toLowerCase() === s.toLowerCase())
  ).slice(0, 5);

  return (
    <div
      className={cn(
        "rounded-2xl bg-card p-6 shadow-soft ring-1 ring-inset ring-border/50 space-y-6",
        disabled && "opacity-60 pointer-events-none"
      )}
    >
      <div className="flex flex-col gap-1">
        <span className="eyebrow text-primary">Tailor your search</span>
        <h2 className="font-display text-xl font-bold leading-tight">
          What kind of role are you after?
        </h2>
        <p className="text-sm text-muted-foreground">
          Optional — but the more specific you are, the closer the matches.
        </p>
      </div>

      {/* Locations */}
      <fieldset className="space-y-3">
        <legend className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <MapPin className="h-4 w-4 text-primary" aria-hidden />
          Locations
        </legend>

        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-input bg-background px-3 py-2 focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2">
          {locations.map((loc) => (
            <span
              key={loc}
              className="inline-flex items-center gap-1 rounded-full bg-primary-tint px-2.5 py-1 text-xs font-medium text-primary"
            >
              {loc}
              <button
                type="button"
                onClick={() => removeLocation(loc)}
                aria-label={`Remove ${loc}`}
                className="rounded-full p-0.5 hover:bg-primary/15"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKey}
            onBlur={() => draft && addLocation(draft)}
            placeholder={
              locations.length === 0
                ? "Type a city or country, press Enter"
                : "Add another…"
            }
            className="min-w-[10ch] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            aria-label="Add location"
          />
        </div>

        {remainingSuggestions.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <span className="text-xs text-muted-foreground self-center">Try:</span>
            {remainingSuggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => addLocation(s)}
                className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-surface-low px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-primary-tint hover:text-primary hover:border-primary/30"
              >
                <Plus className="h-3 w-3" />
                {s}
              </button>
            ))}
          </div>
        )}
      </fieldset>

      {/* Work arrangement */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-foreground">
          Work arrangement
        </legend>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Work arrangement">
          {ARRANGEMENTS.map(({ value: v, label, Icon }) => {
            const active = arrangements.includes(v);
            return (
              <button
                key={v}
                type="button"
                onClick={() => toggleArrangement(v)}
                aria-pressed={active}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground shadow-soft"
                    : "border-border/60 bg-surface-low text-foreground hover:border-primary/40 hover:bg-primary-tint hover:text-primary"
                )}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {label}
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Employment type */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-foreground">
          Employment type
        </legend>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Employment type">
          {EMPLOYMENT_TYPES.map(({ value: v, label }) => {
            const active = employmentTypes.includes(v);
            return (
              <button
                key={v}
                type="button"
                onClick={() => toggleEmployment(v)}
                aria-pressed={active}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground shadow-soft"
                    : "border-border/60 bg-surface-low text-foreground hover:border-primary/40 hover:bg-primary-tint hover:text-primary"
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}
