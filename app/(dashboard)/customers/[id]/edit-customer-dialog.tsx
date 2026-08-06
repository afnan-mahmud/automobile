"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { updateCustomer } from "@/actions/customers";
import { FormField, FormError, fieldInputClass } from "@/components/ui/form-field";
import { User, Phone, Mail, MapPin, Edit, Pencil } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(1, "Customer name is required"),
  phone: z.string().min(1, "Phone number is required"),
  email: z
    .union([z.literal(""), z.string().email("Invalid email address")])
    .optional(),
  address: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function EditCustomerDialog({
  customer,
  trigger,
}: {
  customer: {
    _id: string;
    name: string;
    phone: string;
    email?: string;
    address?: string;
  };
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: customer.name,
      phone: customer.phone,
      email: customer.email || "",
      address: customer.address || "",
    },
  });

  // Keep form in sync when dialog opens
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      reset({
        name: customer.name,
        phone: customer.phone,
        email: customer.email || "",
        address: customer.address || "",
      });
      setServerError(null);
    }
  };

  async function onSubmit(values: FormValues) {
    setServerError(null);
    const result = await updateCustomer({
      id: customer._id,
      name: values.name,
      phone: values.phone,
      email: values.email || undefined,
      address: values.address || undefined,
    });

    if (!result.success) {
      setServerError(result.error);
      return;
    }

    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          trigger ? (
            (trigger as React.ReactElement)
          ) : (
            <Button size="sm" variant="outline" className="gap-2">
              <Pencil className="size-3.5" />
              Edit Customer
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="size-5 text-primary" />
            Edit Customer Information
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-1">
          <FormField
            label="Customer Name"
            htmlFor="name"
            error={errors.name?.message}
          >
            <div className="flex items-center gap-2 px-3">
              <User className="size-4 shrink-0 text-muted-foreground" />
              <Input
                id="name"
                placeholder="e.g. John Doe"
                className={fieldInputClass}
                {...register("name")}
              />
            </div>
          </FormField>

          <FormField
            label="Phone Number"
            htmlFor="phone"
            error={errors.phone?.message}
          >
            <div className="flex items-center gap-2 px-3">
              <Phone className="size-4 shrink-0 text-muted-foreground" />
              <Input
                id="phone"
                placeholder="e.g. 01711223344"
                className={fieldInputClass}
                {...register("phone")}
              />
            </div>
          </FormField>

          <FormField
            label="Email Address"
            htmlFor="email"
            optional
            error={errors.email?.message}
          >
            <div className="flex items-center gap-2 px-3">
              <Mail className="size-4 shrink-0 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="e.g. john@example.com"
                className={fieldInputClass}
                {...register("email")}
              />
            </div>
          </FormField>

          <FormField
            label="Address"
            htmlFor="address"
            optional
            error={errors.address?.message}
          >
            <div className="flex items-center gap-2 px-3">
              <MapPin className="size-4 shrink-0 text-muted-foreground" />
              <Input
                id="address"
                placeholder="e.g. Banani, Dhaka"
                className={fieldInputClass}
                {...register("address")}
              />
            </div>
          </FormField>

          {serverError && <FormError message={serverError} />}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
