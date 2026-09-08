import {House, Link, NotebookText} from "lucide-react";
export function Navbar() {
    return (
        <nav className="fixed bottom-0 text-white left-0 z-50 flex h-16 w-full items-center justify-between border-t border-[black] bg-[#131313] px-4 md:top-0 md:h-screen md:w-14 md:flex-col md:justify-between md:border-r md:border-t-0 md:py-6 md:space-y-8">
                <div className="text-sm hidden md:flex items-center justify-center">
                    <Link />
                </div>

                <div className=" p-2 flex h-full md:flex-col md:items-center md:space-y-4">
                    <a href="/" className="w-11 h-11 flex items-center flex-col rounded-md p-1 text-[#E1E1E1] hover:text-white hover:bg-[#282828] transition-colors">
                        {<House size={22}/>}
                        <span className={"text-[11px] leading-none mt-1"}>main</span>
                    </a>

                    <a href="/status" className="hidden w-11 h-11 items-center flex-col rounded-md p-1 text-[#E1E1E1] hover:text-white hover:bg-[#282828] transition-colors">
                        {<NotebookText size={22}/>}
                        <span className={"text-[11px] leading-none mt-1"}>status</span>
                    </a>
                </div>
                <div>
                    <p>1.0</p>
                </div>

        </nav>
    );
}