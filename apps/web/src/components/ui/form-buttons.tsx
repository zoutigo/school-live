"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "./button";

type BaseProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children?: ReactNode;
};

export function SubmitButton({ children = "Valider", ...props }: BaseProps) {
  return (
    <Button type="submit" {...props}>
      {children}
    </Button>
  );
}

export function BackButton({ children = "Retour", ...props }: BaseProps) {
  return (
    <Button
      type="button"
      variant="secondary"
      iconLeft={<ArrowLeft className="h-4 w-4" />}
      {...props}
    >
      {children}
    </Button>
  );
}
