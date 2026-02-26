'use client'

export default function ScrollToContactsButton() {
  return (
    <a
      href="#contacts"
      onClick={() => {
        setTimeout(() => {
          document.getElementById('contacts-add-btn')?.click()
        }, 400)
      }}
      className="inline-flex items-center gap-1.5 text-xs font-medium text-violet-400 hover:text-violet-300
                 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 px-3 py-1.5 rounded-lg transition-all"
    >
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
      Add Primary Contact
    </a>
  )
}
