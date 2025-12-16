export default function GameLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ 
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: '100vw',
      height: '100vh',
      margin: 0,
      padding: 0,
      overflow: 'hidden'
    }}>
      {children}
    </div>
  );
}



