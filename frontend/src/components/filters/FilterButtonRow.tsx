import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MapPin, Flame, AlertTriangle, ChevronDown, CheckCircle, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface FilterOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  color?: string;
}

interface FilterButtonProps {
  label: string;
  icon: React.ReactNode;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
  activeColor?: string;
}

function FilterButton({ label, icon, value, options, onChange, activeColor }: FilterButtonProps) {
  const activeOption = options.find(o => o.value === value);
  const isFiltered = value !== "all";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={isFiltered ? "default" : "outline"}
          size="sm"
          className={cn(
            "flex items-center gap-2 min-h-[44px] px-3 flex-1 sm:flex-none justify-between sm:justify-center",
            isFiltered && activeColor
          )}
        >
          <span className="flex items-center gap-2">
            {icon}
            <span className="hidden xs:inline">{activeOption?.label || label}</span>
            <span className="xs:hidden">{activeOption?.label?.substring(0, 3) || label.substring(0, 3)}</span>
          </span>
          <ChevronDown className="h-4 w-4 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[160px] bg-popover z-50">
        {options.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex items-center gap-2 cursor-pointer",
              value === option.value && "bg-accent"
            )}
          >
            {option.icon}
            <span className={option.color}>{option.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface FilterButtonRowProps {
  zones: string[];
  activeZone: string;
  onZoneChange: (value: string) => void;
  activeStatus: string;
  onStatusChange: (value: string) => void;
  activeSeverity: string;
  onSeverityChange: (value: string) => void;
}

export default function FilterButtonRow({
  zones,
  activeZone,
  onZoneChange,
  activeStatus,
  onStatusChange,
  activeSeverity,
  onSeverityChange,
}: FilterButtonRowProps) {
  const zoneOptions: FilterOption[] = [
    { value: "all", label: "ทุกโซน" },
    ...zones.map(z => ({ value: z, label: `โซน ${z}` })),
  ];

  const statusOptions: FilterOption[] = [
    { value: "all", label: "ทุกสถานะ" },
    { value: "burning", label: "กำลังไหม้", icon: <Flame className="h-4 w-4 text-destructive" />, color: "text-destructive" },
    { value: "contained", label: "ควบคุมได้", icon: <Shield className="h-4 w-4 text-warning" />, color: "text-warning" },
    { value: "extinguished", label: "ดับแล้ว", icon: <CheckCircle className="h-4 w-4 text-success" />, color: "text-success" },
  ];

  const severityOptions: FilterOption[] = [
    { value: "all", label: "ทุกระดับ" },
    { value: "high", label: "สูง", icon: <AlertTriangle className="h-4 w-4 text-destructive" />, color: "text-destructive" },
    { value: "medium", label: "ปานกลาง", icon: <AlertTriangle className="h-4 w-4 text-warning" />, color: "text-warning" },
    { value: "low", label: "ต่ำ", icon: <AlertTriangle className="h-4 w-4 text-success" />, color: "text-success" },
  ];

  return (
    <div className="flex flex-row gap-2 flex-wrap sm:flex-nowrap">
      <FilterButton
        label="โซน"
        icon={<MapPin className="h-4 w-4" />}
        value={activeZone}
        options={zoneOptions}
        onChange={onZoneChange}
        activeColor="bg-info hover:bg-info/90"
      />
      <FilterButton
        label="สถานะ"
        icon={<Flame className="h-4 w-4" />}
        value={activeStatus}
        options={statusOptions}
        onChange={onStatusChange}
        activeColor="bg-warning hover:bg-warning/90 text-warning-foreground"
      />
      <FilterButton
        label="ความเสี่ยง"
        icon={<AlertTriangle className="h-4 w-4" />}
        value={activeSeverity}
        options={severityOptions}
        onChange={onSeverityChange}
        activeColor="bg-destructive hover:bg-destructive/90"
      />
    </div>
  );
}
