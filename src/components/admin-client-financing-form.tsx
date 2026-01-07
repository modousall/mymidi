
"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import UnifiedFinancingForm from "./unified-financing-form";

type AdminClientFinancingFormProps = {
    onBack: () => void;
};

export default function AdminClientFinancingForm({ onBack }: AdminClientFinancingFormProps) {

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Button onClick={onBack} variant="ghost" size="icon">
          <ArrowLeft />
        </Button>
        <div>
          <h2 className="text-2xl font-bold text-primary">Saisir une demande de Financement Client</h2>
          <p className="text-muted-foreground">Remplissez le formulaire au nom du client. La demande sera évaluée par le moteur de décision.</p>
        </div>
      </div>
      
      <div className="max-w-2xl mx-auto">
        <UnifiedFinancingForm onBack={onBack} isAdminMode={true} />
      </div>
    </div>
  );
}

