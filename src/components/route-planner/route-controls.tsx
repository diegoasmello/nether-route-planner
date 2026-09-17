interface RouteControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onCenter: () => void;
}

function ControlButton({ onClick, label, children }: { onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-8 w-8 items-center justify-center rounded-md bg-neutral-900/80 text-sm font-medium text-neutral-200 backdrop-blur transition-colors hover:bg-neutral-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
    >
      {children}
    </button>
  );
}

export function RouteControls({ onZoomIn, onZoomOut, onCenter }: RouteControlsProps) {
  return (
    <div className="absolute right-3 top-3 flex flex-col gap-1.5">
      <ControlButton onClick={onZoomIn} label="Aumentar zoom">
        +
      </ControlButton>
      <ControlButton onClick={onZoomOut} label="Diminuir zoom">
        −
      </ControlButton>
      <ControlButton onClick={onCenter} label="Centralizar rota">
        ⤢
      </ControlButton>
    </div>
  );
}
