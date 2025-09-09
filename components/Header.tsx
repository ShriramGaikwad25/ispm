import HeaderContent from './HeaderContent';

export function Header() {
  return (
    <header className="top-0 z-50 w-full" style={{ backgroundColor: '#27B973' }}>
      <div className="flex h-[60px] px-6 items-center">
        {/* Main Header Content */}
        <HeaderContent />
      </div>
    </header>
  );
}
