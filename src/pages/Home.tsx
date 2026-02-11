import { useNavigate, Link } from "react-router-dom";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Flame, BarChart3, FileText, Bell } from "lucide-react";

export default function Home() {
  const navigate = useNavigate();

  const quickActions = [
    { title: "แดชบอร์ด", description: "ดูสถิติและกราฟ", icon: BarChart3, href: "/dashboard", color: "bg-info/10 text-info" },
    { title: "เหตุการณ์", description: "จัดการเหตุการณ์ไฟไหม้", icon: FileText, href: "/incidents", color: "bg-warning/10 text-warning" },
    { title: "การแจ้งเตือน", description: "ดูการแจ้งเตือนและอัปเดต", icon: Bell, href: "/notifications", color: "bg-primary/10 text-primary" },
  ];

  return (
    <MainLayout>
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] animate-fade-in">
        <h1 className="text-3xl font-bold text-center mb-2">FireWatch</h1>
        <p className="text-muted-foreground text-center mb-12">
          ระบบจัดการไฟป่า
        </p>

        {/* Big Circular Fire Simulation Button */}
        <button
          onClick={() => navigate("/fire-simulation")}
          className="relative group"
        >
          {/* Outer glow ring */}
          <div className="absolute inset-0 rounded-full bg-primary/30 blur-xl group-hover:blur-2xl transition-all duration-300 scale-110" />
          
          {/* Main button */}
          <div className="relative w-48 h-48 md:w-56 md:h-56 rounded-full bg-gradient-to-br from-primary to-primary/80 flex flex-col items-center justify-center shadow-2xl transition-all duration-300 group-hover:scale-105 group-active:scale-95 border-4 border-primary-foreground/20">
            <Flame className="h-16 w-16 md:h-20 md:w-20 text-primary-foreground mb-2 drop-shadow-lg" />
            <span className="text-lg md:text-xl font-bold text-primary-foreground text-center px-4">
              จำลองไฟ
            </span>
          </div>

          {/* Animated ring */}
          <div className="absolute inset-0 rounded-full border-2 border-primary/50 animate-ping opacity-30" />
        </button>

        <p className="text-sm text-muted-foreground mt-8 text-center max-w-md">
          แตะเพื่อเริ่มจำลองไฟ จัดสรรทรัพยากร และรายงานเหตุการณ์
        </p>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-12 w-full max-w-2xl">
          {quickActions.map((action) => (
            <Link key={action.href} to={action.href}>
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                  <div className={`p-3 rounded-lg ${action.color}`}>
                    <action.icon className="h-6 w-6" />
                  </div>
                  <p className="font-medium">{action.title}</p>
                  <p className="text-xs text-muted-foreground">{action.description}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}
