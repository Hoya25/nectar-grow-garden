import { useState } from "react";
import { Check, Copy } from "lucide-react";

const CodeBlock = ({ children }: { children: string }) => {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative group">
      <pre className="overflow-x-auto rounded-lg p-5 text-sm leading-relaxed" style={{ background: "#0D0D0D", color: "#D9D9D9" }}>
        <code className="whitespace-pre-wrap break-all">{children}</code>
      </pre>
      <button
        onClick={copy}
        className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all"
        style={{ background: copied ? "#E2FF6D" : "#2A2A2A", color: copied ? "#121212" : "#D9D9D9" }}
      >
        {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
      </button>
    </div>
  );
};

export default CodeBlock;
