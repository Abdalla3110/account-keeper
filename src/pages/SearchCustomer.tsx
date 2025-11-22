import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Search, Calendar, ShoppingCart, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface Customer {
  id: string;
  name: string;
  total_debt: number;
  created_at: string;
}

interface Purchase {
  id: string;
  items: { name: string; price: number }[];
  purchase_total: number;
  created_at: string;
}

interface Payment {
  id: string;
  amount_paid: number;
  created_at: string;
}

const SearchCustomer = () => {
  const location = useLocation();
  const [searchName, setSearchName] = useState(
    (location.state as any)?.customerName || ""
  );
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if ((location.state as any)?.customerName) {
      handleSearch();
    }
  }, []);

  const handleSearch = async () => {
    if (!searchName.trim()) return;

    setLoading(true);
    setSearched(true);

    try {
      // Find customer
      const { data: customerData } = await supabase
        .from("customers")
        .select("*")
        .ilike("name", searchName.trim())
        .limit(1)
        .single();

      if (customerData) {
        setCustomer(customerData);

        // Fetch purchases
        const { data: purchasesData } = await supabase
          .from("purchases")
          .select("*")
          .eq("customer_id", customerData.id)
          .order("created_at", { ascending: false });

        setPurchases((purchasesData || []).map(p => ({
          ...p,
          items: p.items as { name: string; price: number }[]
        })));

        // Fetch payments
        const { data: paymentsData } = await supabase
          .from("payments")
          .select("*")
          .eq("customer_id", customerData.id)
          .order("created_at", { ascending: false });

        setPayments(paymentsData || []);
      } else {
        setCustomer(null);
        setPurchases([]);
        setPayments([]);
      }
    } catch (error) {
      console.error("Error searching customer:", error);
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
            <h1 className="text-2xl font-bold">البحث عن عميل</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Search Box */}
        <Card className="p-6 shadow-card mb-6 animate-fade-in">
          <Label htmlFor="searchName" className="text-base font-semibold">
            اسم العميل
          </Label>
          <div className="flex gap-3 mt-2">
            <Input
              id="searchName"
              type="text"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="أدخل اسم العميل للبحث"
              className="text-lg"
            />
            <Button onClick={handleSearch} disabled={loading} className="px-6">
              <Search className="w-5 h-5 ml-2" />
              بحث
            </Button>
          </div>
        </Card>

        {/* Results */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">جاري البحث...</p>
          </div>
        ) : customer ? (
          <div className="space-y-6 animate-slide-up">
            {/* Customer Info */}
            <Card className="p-6 shadow-card">
              <h2 className="text-2xl font-bold mb-4">{customer.name}</h2>
              <div className="flex items-center justify-between p-4 bg-warning-light rounded-lg">
                <span className="text-lg font-semibold">إجمالي المبلغ المستحق:</span>
                <span className="text-3xl font-bold text-warning">
                  {Number(customer.total_debt).toFixed(2)} ج.م
                </span>
              </div>
            </Card>

            {/* Purchases History */}
            {purchases.length > 0 && (
              <Card className="p-6 shadow-card">
                <h3 className="text-xl font-bold mb-4 flex items-center">
                  <ShoppingCart className="w-5 h-5 ml-2 text-primary" />
                  سجل المشتريات
                </h3>
                <div className="space-y-4">
                  {purchases.map((purchase) => (
                    <div key={purchase.id} className="p-4 bg-accent/30 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4 ml-1" />
                          {format(new Date(purchase.created_at), "d MMMM yyyy - h:mm a", {
                            locale: ar,
                          })}
                        </div>
                        <span className="font-bold text-primary">
                          {Number(purchase.purchase_total).toFixed(2)} ج.م
                        </span>
                      </div>
                      <div className="space-y-1">
                        {purchase.items.map((item: any, idx: number) => (
                          <div
                            key={idx}
                            className="flex justify-between text-sm border-b border-border/50 pb-1"
                          >
                            <span>{item.name}</span>
                            <span className="font-semibold">
                              {Number(item.price).toFixed(2)} ج.م
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Payments History */}
            {payments.length > 0 && (
              <Card className="p-6 shadow-card">
                <h3 className="text-xl font-bold mb-4 flex items-center">
                  <DollarSign className="w-5 h-5 ml-2 text-success" />
                  سجل المدفوعات
                </h3>
                <div className="space-y-3">
                  {payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between p-4 bg-success-light rounded-lg"
                    >
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4 ml-1" />
                        {format(new Date(payment.created_at), "d MMMM yyyy - h:mm a", {
                          locale: ar,
                        })}
                      </div>
                      <span className="font-bold text-success">
                        - {Number(payment.amount_paid).toFixed(2)} ج.م
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Quick Actions */}
            <div className="flex gap-3">
              <Link to="/record-payment" state={{ customer }} className="flex-1">
                <Button className="w-full" variant="outline">
                  <DollarSign className="w-4 h-4 ml-2" />
                  تسجيل دفعة
                </Button>
              </Link>
              <Link to="/new-transaction" state={{ customerName: customer.name }} className="flex-1">
                <Button className="w-full gradient-primary">
                  <ShoppingCart className="w-4 h-4 ml-2" />
                  إضافة مشتريات جديدة
                </Button>
              </Link>
            </div>
          </div>
        ) : searched ? (
          <Card className="p-12 text-center shadow-card animate-fade-in">
            <p className="text-lg text-muted-foreground mb-4">لم يتم العثور على العميل</p>
            <Link to="/new-transaction" state={{ customerName: searchName }}>
              <Button>إضافة عميل جديد</Button>
            </Link>
          </Card>
        ) : null}
      </main>
    </div>
  );
};

export default SearchCustomer;
