import { ModuleLoader } from "@/components/shared/ModuleLoader";

export default function RootLoading() {
  return (
    <ModuleLoader
      title="Loading CapFlow..."
      description="Setting up your private financial tracker..."
      variant="fullscreen"
      size="lg"
    />
  );
}
