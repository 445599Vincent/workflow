import { LoaderCircleIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

type SubmitButtonProps = React.ComponentProps<typeof Button> & {
  pending?: boolean;
  pendingText?: string;
};

export function SubmitButton({
  pending,
  pendingText,
  children,
  disabled,
  ...props
}: SubmitButtonProps) {
  return (
    <Button
      type="submit"
      disabled={pending || disabled}
      aria-busy={pending || undefined}
      {...props}
    >
      {pending && <LoaderCircleIcon className="animate-spin" />}
      {pending && pendingText ? pendingText : children}
    </Button>
  );
}
