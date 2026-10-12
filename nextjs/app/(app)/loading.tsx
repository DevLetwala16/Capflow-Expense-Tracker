import { ModuleLoader } from "@/components/shared/ModuleLoader";

export default function Loading() {
  return (
    <ModuleLoader
      title="Loading Module..."
      description="Synchronizing your workspace and local records..."
      variant="module"
      size="md"
    />
  );
}
