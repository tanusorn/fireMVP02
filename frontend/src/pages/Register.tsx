import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Flame, Eye, EyeOff, Loader2, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useOperationCenters } from "@/hooks/useOperationCenters";

export default function Register() {
  const { centers: operationCenters, isLoading: centersLoading } = useOperationCenters();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    operation_center: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError("รหัสผ่านไม่ตรงกัน");
      return;
    }

    if (formData.password.length < 8) {
      setError("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await register({
        email: formData.email,
        password: formData.password,
        name: formData.name,
        department: formData.operation_center || operationCenters[0]?.code || "",
        operation_center: formData.operation_center || operationCenters[0]?.code || "",
      });

      if (result.success) {
        setIsSuccess(true);
        toast({
          title: "ลงทะเบียนสำเร็จ!",
          description: "ตอนนี้คุณสามารถเข้าสู่ระบบด้วยข้อมูลประจำตัวได้แล้ว",
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "ลงทะเบียนไม่สำเร็จ");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 gradient-navy">
        <Card className="w-full max-w-md border-border/50 bg-card/80 backdrop-blur animate-fade-in">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
            <h2 className="text-2xl font-bold mb-2">ลงทะเบียนสำเร็จ!</h2>
            <p className="text-muted-foreground mb-6">
              บัญชีของคุณถูกสร้างเรียบร้อยแล้ว สามารถเข้าสู่ระบบได้ทันที
            </p>
            <Button onClick={() => navigate("/login")} className="w-full">
              ไปหน้าเข้าสู่ระบบ
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 gradient-navy">
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center glow-primary">
            <Flame className="w-8 h-8 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">FireWatch</h1>
            <p className="text-sm text-muted-foreground">ระบบจัดการไฟป่า</p>
          </div>
        </div>

        <Card className="border-border/50 bg-card/80 backdrop-blur">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">สร้างบัญชี</CardTitle>
            <CardDescription className="text-center">
              ลงทะเบียนบัญชีเจ้าหน้าที่ใหม่
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="name">ชื่อ-นามสกุล</Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="สมชาย ใจดี"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email ที่ทำงาน</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@agency.gov"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="operation_center">ศูนย์ปฏิบัติการ</Label>
                <Select
                  value={formData.operation_center}
                  onValueChange={(v) => setFormData({ ...formData, operation_center: v })}
                  disabled={centersLoading}
                >
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder={centersLoading ? "กำลังโหลด..." : "เลือกศูนย์ปฏิบัติการ"} />
                  </SelectTrigger>
                  <SelectContent>
                    {operationCenters.map((center) => (
                      <SelectItem key={center.code} value={center.code}>
                        {center.code} - {center.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">รหัสผ่าน</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    className="h-12 pr-12"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-12 w-12"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">ยืนยันรหัสผ่าน</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  className="h-12"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-base font-semibold glow-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    กำลังสร้างบัญชี...
                  </>
                ) : (
                  "สร้างบัญชี"
                )}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            <p className="text-sm text-center text-muted-foreground">
              มีบัญชีอยู่แล้ว?{" "}
              <Link to="/login" className="text-primary hover:underline">
                เข้าสู่ระบบ
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
