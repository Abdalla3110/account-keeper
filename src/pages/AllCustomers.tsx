import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowRight, Download, Trash2, Edit, Eye } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import * as XLSX from "xlsx";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface CustomerData {
  id: string;
  name: string;
  total_debt: number;
  created_at: string;
  payments: { id: string; amount_paid: number; created_at: string }[];
}

const AllCustomers = () => {
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchAllCustomers();
  }, []);

  const fetchAllCustomers = async () => {
    setLoading(true);
    try {
      const { data: customersData } = await supabase
        .from("customers")
        .select("*")
        .order("created_at", { ascending: false });

      if (customersData) {
        const customersWithPayments = await Promise.all(
          customersData.map(async (customer) => {
            const { data: paymentsData } = await supabase
              .from("payments")
              .select("*")
              .eq("customer_id", customer.id)
              .order("created_at", { ascending: false });

            return {
              ...customer,
              payments: paymentsData || [],
            };
          })
        );

        setCustomers(customersWithPayments);
      }
    } catch (error) {
      console.error("Error fetching customers:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ في تحميل البيانات",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCustomer = async () => {
    if (!customerToDelete) return;

    try {
      // Delete related purchases and payments first
      await supabase.from("purchases").delete().eq("customer_id", customerToDelete);
      await supabase.from("payments").delete().eq("customer_id", customerToDelete);
      
      // Delete customer
      const { error } = await supabase
        .from("customers")
        .delete()
        .eq("id", customerToDelete);

      if (error) throw error;

      toast({
        title: "تم الحذف",
        description: "تم حذف العميل بنجاح",
      });

      fetchAllCustomers();
    } catch (error) {
      console.error("Error deleting customer:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ في حذف العميل",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setCustomerToDelete(null);
    }
  };

  const exportToExcel = () => {
    const exportData = customers.map((customer) => ({
      "اسم العميل": customer.name,
      "إجمالي المبلغ المستحق": Number(customer.total_debt).toFixed(2),
      "عدد الأقساط": customer.payments.length,
      "إجمالي المدفوعات": customer.payments
        .reduce((sum, p) => sum + Number(p.amount_paid), 0)
        .toFixed(2),
      "تاريخ التسجيل": format(new Date(customer.created_at), "d MMMM yyyy", {
        locale: ar,
      }),
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "العملاء");

    XLSX.writeFile(workbook, `عملاء_${format(new Date(), "yyyy-MM-dd")}.xlsx`);

    toast({
      title: "تم التصدير",
      description: "تم تصدير البيانات إلى Excel بنجاح",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/">
                <Button variant="ghost" size="icon">
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <h1 className="text-2xl font-bold">جميع العملاء</h1>
            </div>
            <Button onClick={exportToExcel} className="gradient-primary">
              <Download className="w-4 h-4 ml-2" />
              تصدير Excel
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">جاري التحميل...</p>
          </div>
        ) : customers.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-lg text-muted-foreground mb-4">
              لا يوجد عملاء حتى الآن
            </p>
            <Link to="/new-transaction">
              <Button>إضافة عميل جديد</Button>
            </Link>
          </Card>
        ) : (
          <Card className="p-6 shadow-card">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">اسم العميل</TableHead>
                    <TableHead className="text-right">المبلغ المستحق</TableHead>
                    <TableHead className="text-right">عدد الأقساط</TableHead>
                    <TableHead className="text-right">آخر قسط</TableHead>
                    <TableHead className="text-right">تاريخ التسجيل</TableHead>
                    <TableHead className="text-right">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell className="font-semibold">
                        {customer.name}
                      </TableCell>
                      <TableCell>
                        <span className="text-warning font-bold">
                          {Number(customer.total_debt).toFixed(2)} ج.م
                        </span>
                      </TableCell>
                      <TableCell>{customer.payments.length}</TableCell>
                      <TableCell>
                        {customer.payments.length > 0 ? (
                          <div className="text-sm">
                            <div className="font-semibold text-success">
                              {Number(customer.payments[0].amount_paid).toFixed(2)}{" "}
                              ج.م
                            </div>
                            <div className="text-muted-foreground text-xs">
                              {format(
                                new Date(customer.payments[0].created_at),
                                "d MMM yyyy",
                                { locale: ar }
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            لا يوجد
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(customer.created_at), "d MMMM yyyy", {
                          locale: ar,
                        })}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Link
                            to="/search-customer"
                            state={{ customerName: customer.name }}
                          >
                            <Button variant="outline" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              setCustomerToDelete(customer.id);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذا العميل؟ سيتم حذف جميع المشتريات والمدفوعات
              المرتبطة به. هذا الإجراء لا يمكن التراجع عنه.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCustomer}>
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AllCustomers;
