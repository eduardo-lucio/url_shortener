import { Input } from "@/components/ui/input";
import {useState} from "react";

export function UrlForm() {
    interface responseType {
        originalUrl: string;
        shortUrl: string;
        expirationDate: string;
    }
    interface apiErrorType {
        statusCode: number;
        error: string;
        message: string;
    }
    const [url, setUrl] = useState<string>("");
    const [validDays, setValidDays] = useState<number>(1);
    const [customUrl, setCustomUrl] = useState<string>("");
    const [shortUrl, setShortUrl] = useState<string>("");
    const [apiResponse, setApiResponse] = useState<responseType | null >(null);
    const [apiError, setApiError] = useState<apiErrorType | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isCopied, setIsCopied] = useState<boolean>(false);
    const [validData, setValidData] = useState(new Date());

    async function handleSubmit(e: React.SubmitEvent) {
        e.preventDefault();
        if(!isLoading){
            setIsLoading(true);
            let response;
            setApiResponse(null)
            setApiError(null)
            if(customUrl === "") {
                response = await fetch(`/urls`,{
                    method: "post",
                    headers: {
                        "content-type": "application/json"
                    },
                    body: JSON.stringify({
                        url,
                        validTime: validDays,
                    })
                })
            } else{
                response = await fetch(`/urls/custom`,{
                    method: "post",
                    headers: {
                        "content-type": "application/json"
                    },
                    body: JSON.stringify({
                        url,
                        customName: customUrl,
                        validTime: validDays
                    })
                })
            }
            const data = await response.json();
            if(response.ok){
                setUrl("")
                setValidDays(1)
                setCustomUrl("")
                const dataSchema = new Date(data.expirationDate)
                setValidData(dataSchema)
                setApiResponse(data)
                setShortUrl(`https://urlshortenerel.vercel.app/u/${data.shortUrl}`);
            }else{
                setApiError(data)
            }
            setIsLoading(false)

            console.log("Respost do servidor:", data)
            console.log(shortUrl)
        }

    }
    return (
        <div className="max-w-md">
            <form className="space-y-2" onSubmit={handleSubmit}>
                <div>
                    <label className={"text-sm font-medium text-white"}>Original URL:</label>
                    <Input value={url} type={"url"} placeholder={"https://seulink.com"} required
                    className={"placeholder:text-[#81807D] text-[#E1E1E1] rounded-md border-[#81807D] focus-visible:border-white focus-visible:ring-0 focus-visible:ring-offset-0"}
                    onChange={(e)=>{
                        setUrl(e.target.value);
                    }}></Input>
                </div>
                <div className={"grid grid-cols-1 sm:grid-cols-2 gap-4"}>
                    <div>
                        <label className={"text-sm font-medium text-white"}>Valid days:</label>
                        <Input value={validDays} type={"number"} placeholder={"1"} min={1} max={366} required
                               className={"placeholder:text-[#81807D] text-[#E1E1E1] rounded-md border-[#81807D] focus-visible:border-white focus-visible:ring-0 focus-visible:ring-offset-0"}
                               onChange={(e)=>{
                                   setValidDays(Number(e.target.value));
                               }}></Input>
                    </div>
                    <div>
                        <label className={"text-sm font-medium text-white"}>Custom URL (optional):</label>
                        <Input value={customUrl} type={"text"} placeholder={"custom-url"}
                               className={"placeholder:text-[#81807D] text-[#E1E1E1] rounded-md border-[#81807D] focus-visible:border-white focus-visible:ring-0 focus-visible:ring-offset-0"}
                               onChange={(e)=>{
                                   setCustomUrl(e.target.value);
                               }}></Input>
                    </div>
                </div>

                <button type={"submit"} disabled={isLoading} className={"w-full bg-[#242424] text-white border border-[#81807D] focus-visible:border-white rounded-md p-1 flex justify-center"}>{isLoading ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : "Short url"}</button>
            </form>
            {apiResponse && (
                <div className={"max-w-md"}>
                    <ul className="space-y-2 text-white">
                        <li className={"break-all"}>Original URL: <a href={apiResponse.originalUrl}>{apiResponse.originalUrl}</a></li>
                        <li>Short URL: <a href={shortUrl}>{shortUrl}</a></li>
                        <li>Expiration date: {validData.toLocaleDateString('pt-BR')}</li>
                    </ul>
                    <button className={"w-full bg-[#242424] text-white border border-[#81807D] focus-visible:border-white rounded-md p-1 flex justify-center"} onClick={async ()=>{
                        await navigator.clipboard.writeText(shortUrl)
                        setIsCopied(true)
                        setTimeout(() => setIsCopied(false), 2000)
                    }}>{isCopied ? 'Copied!' : "Copy URL"}</button>
                </div>

            )}
            {apiError && (
                <div className={"text-red-700 max-w-md"}>
                    <p className={"text-center"}>{apiError.message}</p>
                </div>
            )}
        </div>
    )
}