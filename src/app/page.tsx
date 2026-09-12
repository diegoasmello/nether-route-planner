import { RoutePlanner } from "@/components/route-planner/RoutePlanner";

export default function Home() {
  return (
    <div className="flex flex-col lg:h-full">
      <header className="flex shrink-0 items-baseline gap-3 border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
        <h1 className="text-base font-semibold">Nether Hub Route Planner</h1>
        <p className="hidden text-sm text-neutral-500 dark:text-neutral-400 sm:block">
          Planeje rotas precisas para seus portais no Nether
        </p>
      </header>
      <div className="lg:min-h-0 lg:flex-1">
        <RoutePlanner />
      </div>
    </div>
  );
}
