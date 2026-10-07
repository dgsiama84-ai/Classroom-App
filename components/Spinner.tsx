export default function Spinner() {
  return (
    <div className="flex justify-center items-center py-10 gap-1">
      {[0, 1, 2, 3].map(i => (
        <div key={i} style={{
          width: '4px',
          height: '24px',
          borderRadius: '2px',
          background: 'var(--accent)',
          animation: 'bar 0.9s ease-in-out infinite',
          animationDelay: `${i * 0.1}s`,
        }} />
      ))}
    </div>
  )
}