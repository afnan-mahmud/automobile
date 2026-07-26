import * as React from "react"
import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"

/**
 * FormField – a styled wrapper that pairs a label with its control.
 * Provides a modern card-like appearance matching the dashboard design system.
 *
 * Usage (standalone input):
 *   <FormField label="Full Name" htmlFor="name" error={errors.name?.message}>
 *     <Input id="name" {...register("name")} />
 *   </FormField>
 *
 * The inner input/select/textarea should use className="border-0 focus-visible:ring-0 bg-transparent"
 * or use the fieldInputClass / fieldSelectClass helpers exported below.
 */
interface FormFieldProps {
  label: string
  htmlFor?: string
  error?: string
  hint?: string
  optional?: boolean
  icon?: React.ReactNode
  className?: string
  children: React.ReactNode
}

export function FormField({
  label,
  htmlFor,
  error,
  hint,
  optional,
  icon,
  className,
  children,
}: FormFieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-center justify-between px-1">
        <Label
          htmlFor={htmlFor}
          className={cn(
            "text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5",
            error && "text-destructive"
          )}
        >
          {icon}
          {label}
        </Label>
        {optional && (
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground/50">
            Optional
          </span>
        )}
      </div>

      <div
        className={cn(
          "has-focus-within:border-primary/60 has-focus-within:ring-3 has-focus-within:ring-primary/10 has-focus-within:shadow-sm",
          "rounded-xl border bg-muted/40 transition-all duration-200",
          error &&
            "border-destructive/50 has-focus-within:border-destructive has-focus-within:ring-destructive/10"
        )}
      >
        {children}
      </div>

      {error && (
        <p className="flex items-center gap-1 text-xs text-destructive">
          <svg className="size-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {error}
        </p>
      )}
      {hint && !error && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  )
}

/**
 * Class names to apply to Input/Select/Textarea when used inside a FormField.
 * Removes the element's own border and ring so the wrapper handles focus styles.
 */
export const fieldInputClass =
  "border-0 bg-transparent focus-visible:ring-0 focus-visible:border-0 shadow-none"

export const fieldSelectClass =
  "border-0 bg-transparent focus-visible:ring-0 shadow-none"

/**
 * FormSection – groups related fields under a visual section header.
 */
interface FormSectionProps {
  title: string
  description?: string
  className?: string
  children: React.ReactNode
}

export function FormSection({
  title,
  description,
  className,
  children,
}: FormSectionProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="space-y-0.5">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

/**
 * FormError – full-width error banner for server-side errors.
 */
export function FormError({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <div className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
      <svg className="size-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      {message}
    </div>
  )
}
