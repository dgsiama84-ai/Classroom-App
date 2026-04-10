export default function Loading() {
  return (
    <div className="p-4 space-y-4 animate-pulse">
      <div className="h-6 w-32 bg-[#2e2e2e] rounded" />
      <div className="h-10 bg-[#2e2e2e] rounded-xl" />
      <div className="space-y-3 mt-2">
        <div className="h-32 bg-[#2e2e2e] rounded-2xl" />
        <div className="h-48 bg-[#2e2e2e] rounded-2xl" />
      </div>
    </div>
  )
}