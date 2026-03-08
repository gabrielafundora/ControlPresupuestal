export function Spinner({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <div className={`${className} animate-spin rounded-full border-4 border-gray-200 border-t-blue-600`} />
  )
}

export function PageSpinner() {
  return (
    <div className="flex h-64 items-center justify-center">
      <Spinner />
    </div>
  )
}
