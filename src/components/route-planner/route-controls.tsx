import { Maximize2, ZoomIn, ZoomOut } from "lucide-react";

interface RouteControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onCenter: () => void;
}

function ControlButton({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-9.5 w-9.5 items-center justify-center rounded-[3px] border border-border bg-canvas-overlay text-accent-strong transition-colors hover:border-accent hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      {children}
    </button>
  );
}

export function RouteControls({
  onZoomIn,
  onZoomOut,
  onCenter,
}: RouteControlsProps) {
  return (
    <div className="absolute bottom-4.5 right-4.5 flex flex-col gap-1.5">
      <ControlButton onClick={onZoomIn} label="Zoom +">
        <ZoomIn size={18} />
      </ControlButton>
      <ControlButton onClick={onZoomOut} label="Zoom −">
        <ZoomOut size={18} />
      </ControlButton>
      <ControlButton
        onClick={onCenter}
        label="Centralizar todos os caminhos visíveis"
      >
        <Maximize2 size={16} />
      </ControlButton>
    </div>
  );
}
