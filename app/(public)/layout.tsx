import '../globals.css'

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-br">
      <body className="bg-gray-100 min-h-screen">

        <div className="flex items-center justify-center min-h-screen">
          {children}
        </div>

      </body>
    </html>
  )
}