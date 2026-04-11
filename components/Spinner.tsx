export default function Spinner() {
  return (
    <div className="flex justify-center py-10">
      <div style={{
        width: '24px',
        height: '24px',
        borderRadius: '50%',
        border: '2px solid var(--accent)',
        borderTopColor: 'transparent',
        animation: 'spin 0.7s linear infinite',
      }} />
    </div>
  )
}