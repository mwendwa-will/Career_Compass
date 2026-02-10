import { useRef, useState } from "react";
import { Upload, FileText, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  isAnalyzing: boolean;
  error?: string | null;
}

export function FileUpload({ onFileSelect, isAnalyzing, error }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      handleFile(file);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    // Basic validation
    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!validTypes.includes(file.type)) {
      alert("Please upload a PDF or DOCX file.");
      return;
    }
    setFileName(file.name);
    onFileSelect(file);
  };

  const triggerUpload = () => {
    inputRef.current?.click();
  };

  return (
    <div className="w-full max-w-xl mx-auto">
      <AnimatePresence mode="wait">
        {isAnalyzing ? (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-card border border-border rounded-2xl p-10 text-center shadow-sm"
          >
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
                <div className="relative bg-background p-4 rounded-full border border-primary/20">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-semibold font-display">Analyzing Profile</h3>
                <p className="text-muted-foreground text-sm">Extracting skills and experience from {fileName}...</p>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "relative group cursor-pointer bg-card rounded-2xl border-2 border-dashed transition-all duration-300 ease-out p-10 text-center",
              dragActive ? "border-primary bg-primary/5 scale-[1.02]" : "border-border hover:border-primary/50 hover:bg-background/50",
              error ? "border-destructive/50 bg-destructive/5" : ""
            )}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={triggerUpload}
          >
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              accept=".pdf,.docx"
              onChange={handleChange}
            />
            
            <div className="flex flex-col items-center gap-4">
              <div className={cn(
                "p-4 rounded-full transition-colors duration-300",
                error ? "bg-destructive/10 text-destructive" : "bg-primary/5 text-primary group-hover:bg-primary/10"
              )}>
                {error ? <AlertCircle className="w-8 h-8" /> : <Upload className="w-8 h-8" />}
              </div>
              
              <div className="space-y-2">
                <h3 className="text-xl font-display font-medium text-foreground">
                  {error ? "Analysis Failed" : "Drop your CV here"}
                </h3>
                <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                  {error || "Upload your resume in PDF or DOCX format. We'll match your skills to open roles."}
                </p>
              </div>

              {!error && (
                <button 
                  className="mt-2 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-primary border border-primary/20 rounded-lg hover:bg-primary hover:text-primary-foreground transition-all"
                  onClick={(e) => { e.stopPropagation(); triggerUpload(); }}
                >
                  Browse Files
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
