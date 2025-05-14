import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { CohortId, COHORT_DATA } from "@/types/cohort";

interface CohortSelectorProps {
  selectedCohort: CohortId;
  onCohortChange: (cohort: CohortId) => void;
}

export function CohortSelector({
  selectedCohort,
  onCohortChange,
}: CohortSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium">Cohort:</span>
      <Select
        value={selectedCohort}
        onValueChange={(value: CohortId) => onCohortChange(value)}
        name="cohort-selector"
        aria-label="Select cohort"
      >
        <SelectTrigger className="w-[180px]" aria-label="Cohort selector">
          <SelectValue placeholder="Select Cohort">
            {COHORT_DATA[selectedCohort].name}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {Object.values(COHORT_DATA).map((cohort) => (
            <SelectItem key={cohort.id} value={cohort.id}>
              {cohort.name} {cohort.id === "2" ? "(Current)" : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
