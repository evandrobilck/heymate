export default function Modal({ children }) {
  return (
    <div className="modal-backdrop fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4">
      <div className="modal-card max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        {children}
      </div>
    </div>
  )
}
