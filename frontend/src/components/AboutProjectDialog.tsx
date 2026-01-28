import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ExternalLink, Mail, Info } from "lucide-react";

const STORAGE_KEY = "firewatch-about-dialog-seen";

export function AboutProjectDialog() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const hasSeen = localStorage.getItem(STORAGE_KEY);
    if (hasSeen !== "true") {
      setIsOpen(true);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      {/* 
        Mobile: เกือบเต็มจอ (w-[95vw], max-h-[90vh])
        Desktop: max-w-md ตามปกติ
      */}
      <DialogContent className="w-[95vw] max-w-md max-h-[90vh] flex flex-col p-4 sm:p-6">
        <DialogHeader className="shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 sm:p-2 rounded-lg bg-primary/10">
              <Info className="h-5 w-5 sm:h-5 sm:w-5 text-primary" />
            </div>
            <DialogTitle className="text-base sm:text-lg font-semibold">
              เกี่ยวกับโครงการ
            </DialogTitle>
          </div>
        </DialogHeader>

        {/* ScrollArea สำหรับ scroll บนมือถือ */}
        <ScrollArea className="flex-1 min-h-0 -mx-4 px-4 sm:-mx-6 sm:px-6">
          <DialogDescription asChild>
            <div className="space-y-4 py-3 text-sm sm:text-base text-foreground leading-relaxed">
              <p>
                เว็บแอปพลิเคชันนี้เป็นเวอร์ชัน MVP (Minimum Viable Product)
                เวอร์ชันแรก จัดทำโดยกลุ่มโครงงานที่ 12 ปีการศึกษา 2568
                เป็นส่วนหนึ่งของรายวิชา 255491
              </p>

              <p>
                คณะผู้จัดทำหวังว่าเว็บแอปพลิเคชันนี้จะเป็นประโยชน์ต่อเจ้าหน้าที่และผู้ที่สนใจ
                สามารถนำไปต่อยอดพัฒนาได้
              </p>

              {/* GitHub Link - touch-friendly */}
              <a
                href="https://github.com/tanusorn/fireMVP02"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 sm:p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors min-h-[48px]"
              >
                <ExternalLink className="h-5 w-5 text-muted-foreground shrink-0" />
                <span className="text-primary hover:underline break-all text-sm sm:text-base">
                  github.com/tanusorn/fireMVP02
                </span>
              </a>

              {/* Email Link - touch-friendly */}
              <a
                href="mailto:tanusorn.497@gmail.com"
                className="flex items-center gap-3 p-3 sm:p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors min-h-[48px]"
              >
                <Mail className="h-5 w-5 text-muted-foreground shrink-0" />
                <span className="text-primary hover:underline text-sm sm:text-base">
                  tanusorn.497@gmail.com
                </span>
              </a>

              <p className="text-muted-foreground">ขอขอบคุณครับ</p>
            </div>
          </DialogDescription>
        </ScrollArea>

        {/* ปุ่มปิด - ขนาดใหญ่สำหรับมือถือ (min-h-[48px]) */}
        <DialogFooter className="shrink-0 pt-4">
          <Button
            onClick={handleClose}
            className="w-full sm:w-auto min-h-[48px] sm:min-h-[40px] text-base sm:text-sm"
            aria-label="ปิดหน้าต่างเกี่ยวกับโครงการ"
          >
            ปิด
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
