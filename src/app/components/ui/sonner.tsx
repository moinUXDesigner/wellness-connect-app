"use client";

import { Toaster as Sonner, ToasterProps } from "sonner";
import { useThemeMode } from "../../features/theme/useThemeMode";

const Toaster = ({ ...props }: ToasterProps) => {
  const { mode } = useThemeMode();

  return (
    <Sonner
      theme={mode as "light" | "dark"}
      position="top-center"
      closeButton
      duration={5000}
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          success: "bg-status-success-subtle text-status-success border-status-success",
          warning: "bg-status-warning-subtle text-status-warning border-status-warning",
          error: "bg-status-error-subtle text-status-error border-status-error",
          info: "bg-status-info-subtle text-status-info border-status-info",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
