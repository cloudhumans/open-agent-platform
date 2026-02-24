import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { TriangleAlert } from "lucide-react";

interface StaleSupervisorsWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StaleSupervisorsWarningDialog({
  open,
  onOpenChange,
}: StaleSupervisorsWarningDialogProps) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <AlertDialogContent className="border-amber-500/50">
        <AlertDialogHeader>
          <div className="mb-3 flex items-center justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950">
              <TriangleAlert className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <AlertDialogTitle className="text-center">
            Stale supervisor configuration detected
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            Some supervisors reference this agent and may need to be redeployed
            to pick up the latest changes.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-center">
          <AlertDialogAction onClick={() => onOpenChange(false)}>
            Got it
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
