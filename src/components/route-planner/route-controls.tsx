interface RouteControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onCenter: () => void;
}

function ControlButton({
  onClick,
  label,
  fontSizeClassName,
  children,
}: {
  onClick: () => void;
  label: string;
  fontSizeClassName: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex h-[38px] w-[38px] items-center justify-center rounded-[3px] border border-border bg-canvas-overlay font-mono-ui text-accent-strong transition-colors hover:border-accent hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${fontSizeClassName}`}
    >
      {children}
    </button>
  );
}

export function RouteControls({ onZoomIn, onZoomOut, onCenter }: RouteControlsProps) {
  return (
    <div className="absolute bottom-[18px] right-[18px] flex flex-col gap-1.5">
      <ControlButton onClick={onZoomIn} label="Zoom +" fontSizeClassName="text-[17px]">
        +
      </ControlButton>
      <ControlButton onClick={onZoomOut} label="Zoom −" fontSizeClassName="text-[17px]">
        −
      </ControlButton>
      <ControlButton onClick={onCenter} label="Centralizar todos os caminhos visíveis" fontSizeClassName="text-[13px]">
        ⤧
      </ControlButton>
    </div>
  );
}
