"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createCustomer } from "@/actions/customers";
import { FormField, FormError, fieldInputClass } from "@/components/ui/form-field";
import { User, Phone, Mail, MapPin } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(1, "Phone is required"),
  email: z.string().optional(),
  address: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function CustomerForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema) });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    const result = await createCustomer(values);

    if (!result.success) {
      setServerError(result.error);
      return;
    }

    router.push(`/customers/${result.data.id}`);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-lg space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Full Name" htmlFor="name" error={errors.name?.message}>
          <div className="flex items-center gap-2 px-3">
            <User className="size-4 shrink-0 text-muted-foreground" />
            <Input
              id="name"
              placeholder="e.g. Karim Hossain"
              className={fieldInputClass}
              {...register("name")}
            />
          </div>
        </FormField>

        <FormField label="Phone" htmlFor="phone" error={errors.phone?.message}>
          <div className="flex items-center gap-2 px-3">
            <Phone className="size-4 shrink-0 text-muted-foreground" />
            <Input
              id="phone"
              placeholder="01XXXXXXXXX"
              className={fieldInputClass}
              {...register("phone")}
            />
          </div>
        </FormField>
      </div>

      <FormField label="Email" htmlFor="email" optional error={errors.email?.message}>
        <div className="flex items-center gap-2 px-3">
          <Mail className="size-4 shrink-0 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            placeholder="customer@email.com"
            className={fieldInputClass}
            {...register("email")}
          />
        </div>
      </FormField>

      <FormField label="Address" htmlFor="address" optional>
        <div className="flex items-center gap-2 px-3">
          <MapPin className="size-4 shrink-0 text-muted-foreground" />
          <Input
            id="address"
            placeholder="Street, area, city..."
            className={fieldInputClass}
            {...register("address")}
          />
        </div>
      </FormField>

      <FormError message={serverError} />

      <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto px-8">
        {isSubmitting ? "Saving..." : "Save Customer"}
      </Button>
    </form>
  );
}
