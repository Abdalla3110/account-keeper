import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowRight, Search } from "lucide-react";

interface Customer {
  id: string;
  name: string;
  total_debt: number;
}

const RecordPayment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchName, setSearchName] = useState("");
  const [customer, setCustomer] = useState<Customer | null>(
    (location.state as any)?.customer || null
  );
  const [paymentAmount, setPaymentAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  const handleSearch = async () => {
    if (!searchName.trim()) return;

    setSearchLoading(true);

    try {
      const { data: customerData } = await supabase
        .from("customers")
        .select("*")
        .ilike("name", searchName.trim())
        .limit(1)
        .single();

      if (customerData) {
        setCustomer(customerData);
      } else {
        toast.error("لم يتم العثور على العميل");
        setCustomer(null);
      }
    } catch (error) {
      console.error("Error searching customer:", error);
      toast.error("حدث خطأ أثناء البحث");
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customer) {
      toast.error("الرجاء اختيار عميل أولاً");
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("الرجاء إدخال مبلغ صحيح");
      return;
    }

    if (amount > Number(customer.total_debt)) {
      toast.error("المبلغ المدفوع أكبر من المبلغ المستحق");
      return;
    }

    setLoading(true);

    try {
      const newDebt = Number(customer.total_debt) - amount;

      // Update customer debt
      const { error: updateError } = await supabase
        .from("customers")
        .update({ total_debt: newDebt })
        .eq("id", customer.id);

      if (updateError) throw updateError;

      // Record payment
      const { error: paymentError } = await supabase.from("payments").insert({
        customer_id: customer.id,
        amount_paid: amount,
      });

      if (paymentError) throw paymentError;

      toast.success("تم تسجيل الدفعة بنجاح");
      navigate("/search-customer", { state: { customerName: customer.name } });
    } catch (error) {
      console.error("Error recording payment:", error);
      toast.error("حدث خطأ أثناء تسجيل الدفعة");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="icon">
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">تسجيل دفعة</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="p-6 shadow-card animate-fade-in">
          {/* Search Customer */}
          {!customer && (
            <div className="mb-6">
              <Label htmlFor="searchName" className="text-base font-semibold">
                البحث عن العميل
              </Label>
              <div className="flex gap-3 mt-2">
                <Input
                  id="searchName"
                  type="text"
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="أدخل اسم العميل"
                  className="text-lg"
                />
                <Button onClick={handleSearch} disabled={searchLoading}>
                  <Search className="w-5 h-5 ml-2" />
                  بحث
                </Button>
              </div>
            </div>
          )}

          {/* Customer Info & Payment Form */}
          {customer && (
            <form onSubmit={handleSubmit}>
              {/* Customer Info */}
              <div className="mb-6 p-4 bg-accent/30 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-lg font-semibold">العميل:</span>
                  <span className="text-xl font-bold text-primary">{customer.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-base">المبلغ المستحق:</span>
                  <span className="text-2xl font-bold text-warning">
                    {Number(customer.total_debt).toFixed(2)} ج.م
                  </span>
                </div>
              </div>

              {/* Payment Amount */}
              <div className="mb-6">
                <Label htmlFor="paymentAmount" className="text-base font-semibold">
                  المبلغ المدفوع
                </Label>
                <Input
                  id="paymentAmount"
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="أدخل المبلغ المدفوع"
                  className="mt-2 text-lg"
                  step="0.01"
                  min="0"
                  max={Number(customer.total_debt)}
                  required
                />
              </div>

              {/* New Debt Preview */}
              {paymentAmount && !isNaN(parseFloat(paymentAmount)) && (
                <div className="mb-6 p-4 bg-success-light rounded-lg animate-fade-in">
                  <div className="flex justify-between items-center">
                    <span className="text-base font-semibold">المبلغ المتبقي بعد الدفع:</span>
                    <span className="text-2xl font-bold text-success">
                      {(Number(customer.total_debt) - parseFloat(paymentAmount)).toFixed(2)}{" "}
                      ج.م
                    </span>
                  </div>
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCustomer(null)}
                  className="flex-1"
                >
                  تغيير العميل
                </Button>
                <Button
                  type="submit"
                  className="flex-1 gradient-primary text-lg h-12"
                  disabled={loading}
                >
                  {loading ? "جاري الحفظ..." : "تسجيل الدفعة"}
                </Button>
              </div>
            </form>
          )}
        </Card>
      </main>
    </div>
  );
};

export default RecordPayment;
