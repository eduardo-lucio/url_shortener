import {Link, NotebookText} from "lucide-react";

export function Navbar() {
    return (
        <nav className="fixed bottom-0 text-white left-0 z-50 flex h-16 w-full items-center justify-around border-t border-[black] bg-[#131313] px-4 md:top-0 md:h-screen md:w-14 md:flex-col md:justify-start md:border-r md:border-t-0 md:py-6 md:space-y-8">
            <div className="hidden md:flex items-center justify-center">
                {"imagem"}
            </div>

            <div className="flex w-full justify-around md:flex-col md:items-center md:space-y-4">
                <a href="/" className="p-2 text-[#E1E1E1] hover:text-white transition-colors">
                    {<Link/>}
                </a>

                <a href="/stats" className="p-2 text-[#E1E1E1] hover:text-white transition-colors">
                    {<NotebookText/>}
                </a>
            </div>
            <div className={"self-end"}>
                <p>1.0</p>
            </div>

        </nav>
    );
}