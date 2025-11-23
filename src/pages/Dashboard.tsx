import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Users, ShoppingCart, DollarSign, TrendingUp, Table } from "lucide-react";

interface Stats {
  totalCustomers: number;
  totalDebt: number;
  totalPurchases: number;
  totalPayments: number;
}

const Dashboard = () => {
  const [stats, setStats] = useState<Stats>({
    totalCustomers: 0,
    totalDebt: 0,
    totalPurchases: 0,
    totalPayments: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [customersRes, purchasesRes, paymentsRes] = await Promise.all([
        supabase.from("customers").select("total_debt"),
        supabase.from("purchases").select("purchase_total"),
        supabase.from("payments").select("amount_paid"),
      ]);

      const totalDebt =
        customersRes.data?.reduce((sum, c) => sum + Number(c.total_debt), 0) || 0;
      const totalPurchasesAmount =
        purchasesRes.data?.reduce((sum, p) => sum + Number(p.purchase_total), 0) || 0;
      const totalPaymentsAmount =
        paymentsRes.data?.reduce((sum, p) => sum + Number(p.amount_paid), 0) || 0;

      setStats({
        totalCustomers: customersRes.data?.length || 0,
        totalDebt,
        totalPurchases: totalPurchasesAmount,
        totalPayments: totalPaymentsAmount,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({
    title,
    value,
    icon: Icon,
    color,
  }: {
    title: string;
    value: string;
    icon: any;
    color: string;
  }) => (
    <Card className="p-6 shadow-card hover:shadow-card-hover animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground mb-1">{title}</p>
          <p className={`text-3xl font-bold ${color}`}>{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${color.replace("text-", "bg-")}/10`}>
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
      </div>
    </Card>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-foreground">نظام إدارة الحسابات</h1>
            <div className="flex gap-2">
              <Link to="/new-transaction">
                <Button className="gradient-primary">إضافة معاملة</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="إجمالي العملاء"
            value={stats.totalCustomers.toString()}
            icon={Users}
            color="text-primary"
          />
          <StatCard
            title="إجمالي الديون"
            value={`${stats.totalDebt.toFixed(2)} ج.م`}
            icon={TrendingUp}
            color="text-warning"
          />
          <StatCard
            title="إجمالي المشتريات"
            value={`${stats.totalPurchases.toFixed(2)} ج.م`}
            icon={ShoppingCart}
            color="text-primary"
          />
          <StatCard
            title="إجمالي المدفوعات"
            value={`${stats.totalPayments.toFixed(2)} ج.م`}
            icon={DollarSign}
            color="text-success"
          />
        </div>

        {/* Quick Actions */}
        <Card className="p-6 shadow-card animate-slide-up">
          <h2 className="text-xl font-bold mb-4">الإجراءات السريعة</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link to="/new-transaction">
              <Button className="w-full h-24 text-lg" variant="outline">
                <ShoppingCart className="ml-2" />
                إضافة معاملة جديدة
              </Button>
            </Link>
            <Link to="/search-customer">
              <Button className="w-full h-24 text-lg" variant="outline">
                <Users className="ml-2" />
                البحث عن عميل
              </Button>
            </Link>
            <Link to="/all-customers">
              <Button className="w-full h-24 text-lg gradient-primary">
                <Table className="ml-2" />
                جميع العملاء
              </Button>
            </Link>
            <Link to="/record-payment">
              <Button className="w-full h-24 text-lg" variant="outline">
                <DollarSign className="ml-2" />
                تسجيل دفعة
              </Button>
            </Link>
          </div>
        </Card>
      </main>
    </div>
  );
};

export default Dashboard;
