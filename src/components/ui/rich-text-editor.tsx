import { useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function RichTextEditor({ value, onChange, placeholder, className }: RichTextEditorProps) {
  const [ReactQuill, setReactQuill] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Dynamically import Quill to avoid SSR issues
    import("react-quill").then((mod) => {
      setReactQuill(() => mod.default);
    });

    // Import Quill CSS
    import("react-quill/dist/quill.snow.css");
  }, []);

  const handleChange = useCallback(
    (content: string) => {
      onChange(content);
    },
    [onChange]
  );

  if (!mounted || !ReactQuill) {
    return (
      <div className={cn("min-h-[300px] border rounded-md p-4 bg-muted/50 animate-pulse", className)}>
        <p className="text-sm text-muted-foreground">Loading editor...</p>
      </div>
    );
  }

  return (
    <div className={cn("rich-text-editor-wrapper", className)}>
      <ReactQuill
        theme="snow"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        modules={{
          toolbar: [
            [{ header: [1, 2, 3, false] }],
            ["bold", "italic", "underline", "strike"],
            [{ list: "ordered" }, { list: "bullet" }],
            [{ indent: "-1" }, { indent: "+1" }],
            [{ align: [] }],
            ["link"],
            ["clean"],
          ],
        }}
        formats={[
          "header",
          "bold",
          "italic",
          "underline",
          "strike",
          "list",
          "bullet",
          "indent",
          "align",
          "link",
        ]}
        className="bg-background"
      />
    </div>
  );
}
