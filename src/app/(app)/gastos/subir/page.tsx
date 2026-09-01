import { UploadForm } from "@/components/expenses/UploadForm";

export const dynamic = "force-dynamic";

export default function SubirPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Subir resumen</h1>
      <UploadForm />
    </div>
  );
}
