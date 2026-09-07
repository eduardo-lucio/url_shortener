import './App.css'
import {UrlForm} from "@/components/UrlForm.tsx";
import {Navbar} from "@/components/Navbar.tsx";

function App() {
  return (
      <div className="min-h-screen bg-[black] text-white">
          <Navbar />
          <main className="flex min-h-screen items-center justify-center p-4 pb-20 md:pb-4 md:pl-50">
              <UrlForm />
          </main>
      </div>
  )
}

export default App
