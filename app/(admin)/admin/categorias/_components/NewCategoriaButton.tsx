"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button, Dialog } from "@/components/admin";
import { CategoryForm } from "./CategoryForm";
import { createCategoria } from "../_actions";

export function NewCategoriaButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Nova Categoria
      </Button>

      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Nova Categoria"
        description="Preencha os dados para criar uma nova categoria."
      >
        <CategoryForm
          action={createCategoria}
          onSuccess={() => setOpen(false)}
          submitLabel="Criar Categoria"
        />
      </Dialog>
    </>
  );
}
