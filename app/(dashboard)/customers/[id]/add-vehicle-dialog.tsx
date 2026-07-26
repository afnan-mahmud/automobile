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
import { createVehicle } from "@/actions/vehicles";
import { FormField, FormError, fieldInputClass } from "@/components/ui/form-field";
import { Car, Hash, Palette, Calendar } from "lucide-react";

const formSchema = z.object({
  registrationNumber: z.string().min(1, "Registration number is required"),
  make: z.string().optional(),
  model: z.string().optional(),
  year: z.string().optional(),
  color: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function AddVehicleDialog({ customerId }: { customerId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema) });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    const result = await createVehicle({
      customerId,
      registrationNumber: values.registrationNumber,
      make: values.make,
      model: values.model,
      year: values.year ? Number(values.year) : undefined,
      color: values.color,
    });

    if (!result.success) {
      setServerError(result.error);
      return;
    }

    reset();
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm">Add Vehicle</Button>} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Vehicle</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-1">
          <FormField
            label="Registration Number"
            htmlFor="registrationNumber"
            error={errors.registrationNumber?.message}
          >
            <div className="flex items-center gap-2 px-3">
              <Hash className="size-4 shrink-0 text-muted-foreground" />
              <Input
                id="registrationNumber"
                placeholder="DHAKA-METRO-GA-11-1234"
                className={fieldInputClass}
                {...register("registrationNumber")}
              />
            </div>
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Make" htmlFor="make" optional>
              <div className="flex items-center gap-2 px-3">
                <Car className="size-4 shrink-0 text-muted-foreground" />
                <Input
                  id="make"
                  placeholder="Toyota"
                  className={fieldInputClass}
                  {...register("make")}
                />
              </div>
            </FormField>
            <FormField label="Model" htmlFor="model" optional>
              <Input
                id="model"
                placeholder="Corolla"
                className={`${fieldInputClass} px-3`}
                {...register("model")}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Year" htmlFor="year" optional>
              <div className="flex items-center gap-2 px-3">
                <Calendar className="size-4 shrink-0 text-muted-foreground" />
                <Input
                  id="year"
                  type="number"
                  placeholder="2020"
                  className={fieldInputClass}
                  {...register("year")}
                />
              </div>
            </FormField>
            <FormField label="Color" htmlFor="color" optional>
              <div className="flex items-center gap-2 px-3">
                <Palette className="size-4 shrink-0 text-muted-foreground" />
                <Input
                  id="color"
                  placeholder="White"
                  className={fieldInputClass}
                  {...register("color")}
                />
              </div>
            </FormField>
          </div>

          <FormError message={serverError} />

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Saving..." : "Save Vehicle"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
