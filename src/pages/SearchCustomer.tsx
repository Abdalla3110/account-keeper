import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Search, Calendar, ShoppingCart, DollarSign, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editType, setEditType] = useState<"name" | "purchase" | "payment" | null>(null);
  const [editData, setEditData] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteType, setDeleteType] = useState<"purchase" | "payment" | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if ((location.state as any)?.customerName) {
      handleSearch();
    }
  }, []);

  const handleSearch = async () => {
    if (!searchName.trim()) return;

    setLoading(true);
    setSearched(true);
    setSelectedCustomer(null);
    setPurchases([]);
    setPayments([]);

    try {
      // Find all customers matching the search
      const { data: customersData } = await supabase
        .from("customers")
        .select("*")
        .ilike("name", `%${searchName.trim()}%`)
        .order("name");

      setSearchResults(customersData || []);
    } catch (error) {
      console.error("Error searching customer:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCustomer = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setLoading(true);

    try {
      // Fetch purchases
      const { data: purchasesData } = await supabase
        .from("purchases")
        .select("*")
        .eq("customer_id", customer.id)
        .order("created_at", { ascending: false });

      setPurchases((purchasesData || []).map(p => ({
        ...p,
        items: p.items as { name: string; price: number }[]
      })));

      // Fetch payments
      const { data: paymentsData } = await supabase
        .from("payments")
        .select("*")
        .eq("customer_id", customer.id)
        .order("created_at", { ascending: false });

      setPayments(paymentsData || []);
    } catch (error) {
      console.error("Error fetching customer data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleEditName = async () => {
    if (!selectedCustomer || !editData?.name) return;

    try {
      const { error } = await supabase
        .from("customers")
        .update({ name: editData.name })
        .eq("id", selectedCustomer.id);

      if (error) throw error;

      toast({
        title: "تم التحديث",
        description: "تم تحديث اسم العميل بنجاح",
      });

      setSelectedCustomer({ ...selectedCustomer, name: editData.name });
      setEditDialogOpen(false);
    } catch (error) {
      console.error("Error updating customer:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ في التحديث",
        variant: "destructive",
      });
    }
  };

  const handleEditPurchase = async () => {
    if (!editData) return;

    try {
      const { error } = await supabase
        .from("purchases")
        .update({
          items: editData.items,
          purchase_total: editData.purchase_total,
        })
        .eq("id", editData.id);

      if (error) throw error;

      toast({
        title: "تم التحديث",
        description: "تم تحديث المشتريات بنجاح",
      });

      // Refresh data
      if (selectedCustomer) {
        handleSelectCustomer(selectedCustomer);
      }
      setEditDialogOpen(false);
    } catch (error) {
      console.error("Error updating purchase:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ في التحديث",
        variant: "destructive",
      });
    }
  };

  const handleEditPayment = async () => {
    if (!selectedCustomer || !editData) return;

    try {
      const oldPayment = payments.find((p) => p.id === editData.id);
      if (!oldPayment) return;

      const difference = editData.amount_paid - oldPayment.amount_paid;

      // Update payment
      const { error: paymentError } = await supabase
        .from("payments")
        .update({ amount_paid: editData.amount_paid })
        .eq("id", editData.id);

      if (paymentError) throw paymentError;

      // Update customer debt
      const { error: customerError } = await supabase
        .from("customers")
        .update({ total_debt: selectedCustomer.total_debt + difference })
        .eq("id", selectedCustomer.id);

      if (customerError) throw customerError;

      toast({
        title: "تم التحديث",
        description: "تم تحديث الدفعة بنجاح",
      });

      if (selectedCustomer) {
        handleSelectCustomer(selectedCustomer);
      }
      setEditDialogOpen(false);
    } catch (error) {
      console.error("Error updating payment:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ في التحديث",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteType || !deleteId || !selectedCustomer) return;

    try {
      if (deleteType === "purchase") {
        const purchase = purchases.find((p) => p.id === deleteId);
        if (!purchase) return;

        // Delete purchase
        const { error } = await supabase
          .from("purchases")
          .delete()
          .eq("id", deleteId);

        if (error) throw error;

        // Update customer debt
        await supabase
          .from("customers")
          .update({ total_debt: selectedCustomer.total_debt - purchase.purchase_total })
          .eq("id", selectedCustomer.id);
      } else if (deleteType === "payment") {
        const payment = payments.find((p) => p.id === deleteId);
        if (!payment) return;

        // Delete payment
        const { error } = await supabase
          .from("payments")
          .delete()
          .eq("id", deleteId);

        if (error) throw error;

        // Update customer debt
        await supabase
          .from("customers")
          .update({ total_debt: selectedCustomer.total_debt + payment.amount_paid })
          .eq("id", selectedCustomer.id);
      }

      toast({
        title: "تم الحذف",
        description: "تم الحذف بنجاح",
      });

      if (selectedCustomer) {
        handleSelectCustomer(selectedCustomer);
      }
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error("Error deleting:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ في الحذف",
        variant: "destructive",
      });
    } finally {
      setDeleteId(null);
      setDeleteType(null);
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
        {loading && !selectedCustomer ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">جاري البحث...</p>
          </div>
        ) : searchResults.length > 0 && !selectedCustomer ? (
          <div className="space-y-4 animate-slide-up">
            <h2 className="text-xl font-bold">نتائج البحث ({searchResults.length})</h2>
            <div className="grid gap-4">
              {searchResults.map((customer) => (
                <Card
                  key={customer.id}
                  className="p-4 shadow-card hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => handleSelectCustomer(customer)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold">{customer.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        تاريخ التسجيل: {format(new Date(customer.created_at!), "d MMMM yyyy", { locale: ar })}
                      </p>
                    </div>
                    <div className="text-left">
                      <p className="text-sm text-muted-foreground mb-1">المبلغ المستحق</p>
                      <p className="text-2xl font-bold text-warning">
                        {Number(customer.total_debt).toFixed(2)} ج.م
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ) : selectedCustomer ? (
          <div className="space-y-6 animate-slide-up">
            {/* Back to Results */}
            <Button
              variant="outline"
              onClick={() => {
                setSelectedCustomer(null);
                setPurchases([]);
                setPayments([]);
              }}
            >
              <ArrowRight className="w-4 h-4 ml-2" />
              العودة للنتائج
            </Button>

            {/* Customer Info */}
            <Card className="p-6 shadow-card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">{selectedCustomer.name}</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditType("name");
                    setEditData({ name: selectedCustomer.name });
                    setEditDialogOpen(true);
                  }}
                >
                  <Edit className="w-4 h-4 ml-2" />
                  تعديل الاسم
                </Button>
              </div>
              <div className="flex items-center justify-between p-4 bg-warning-light rounded-lg">
                <span className="text-lg font-semibold">إجمالي المبلغ المستحق:</span>
                <span className="text-3xl font-bold text-warning">
                  {Number(selectedCustomer.total_debt).toFixed(2)} ج.م
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
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-primary">
                            {Number(purchase.purchase_total).toFixed(2)} ج.م
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditType("purchase");
                              setEditData(purchase);
                              setEditDialogOpen(true);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setDeleteType("purchase");
                              setDeleteId(purchase.id);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
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
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-success">
                          - {Number(payment.amount_paid).toFixed(2)} ج.م
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditType("payment");
                            setEditData(payment);
                            setEditDialogOpen(true);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setDeleteType("payment");
                            setDeleteId(payment.id);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Quick Actions */}
            <div className="flex gap-3">
              <Link to="/record-payment" state={{ customer: selectedCustomer }} className="flex-1">
                <Button className="w-full" variant="outline">
                  <DollarSign className="w-4 h-4 ml-2" />
                  تسجيل دفعة
                </Button>
              </Link>
              <Link to="/new-transaction" state={{ customerName: selectedCustomer.name }} className="flex-1">
                <Button className="w-full gradient-primary">
                  <ShoppingCart className="w-4 h-4 ml-2" />
                  إضافة مشتريات جديدة
                </Button>
              </Link>
            </div>
          </div>
        ) : searched && searchResults.length === 0 ? (
          <Card className="p-12 text-center shadow-card animate-fade-in">
            <p className="text-lg text-muted-foreground mb-4">لم يتم العثور على أي عميل</p>
            <Link to="/new-transaction" state={{ customerName: searchName }}>
              <Button>إضافة عميل جديد</Button>
            </Link>
          </Card>
        ) : null}
      </main>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editType === "name" && "تعديل اسم العميل"}
              {editType === "purchase" && "تعديل المشتريات"}
              {editType === "payment" && "تعديل الدفعة"}
            </DialogTitle>
          </DialogHeader>

          {editType === "name" && (
            <div className="space-y-4">
              <Label htmlFor="editName">اسم العميل</Label>
              <Input
                id="editName"
                value={editData?.name || ""}
                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
              />
            </div>
          )}

          {editType === "purchase" && editData && (
            <div className="space-y-4">
              <div>
                <Label>المنتجات</Label>
                {editData.items.map((item: any, idx: number) => (
                  <div key={idx} className="flex gap-2 mt-2">
                    <Input
                      value={item.name}
                      onChange={(e) => {
                        const newItems = [...editData.items];
                        newItems[idx].name = e.target.value;
                        setEditData({ ...editData, items: newItems });
                      }}
                      placeholder="اسم المنتج"
                    />
                    <Input
                      type="number"
                      value={item.price}
                      onChange={(e) => {
                        const newItems = [...editData.items];
                        newItems[idx].price = parseFloat(e.target.value) || 0;
                        const total = newItems.reduce((sum, i) => sum + i.price, 0);
                        setEditData({ ...editData, items: newItems, purchase_total: total });
                      }}
                      placeholder="السعر"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const newItems = editData.items.filter((_: any, i: number) => i !== idx);
                        const total = newItems.reduce((sum: number, i: any) => sum + i.price, 0);
                        setEditData({ ...editData, items: newItems, purchase_total: total });
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="text-lg font-bold">
                الإجمالي: {Number(editData.purchase_total).toFixed(2)} ج.م
              </div>
            </div>
          )}

          {editType === "payment" && (
            <div className="space-y-4">
              <Label htmlFor="editPayment">المبلغ المدفوع</Label>
              <Input
                id="editPayment"
                type="number"
                value={editData?.amount_paid || 0}
                onChange={(e) =>
                  setEditData({ ...editData, amount_paid: parseFloat(e.target.value) || 0 })
                }
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              إلغاء
            </Button>
            <Button
              onClick={() => {
                if (editType === "name") handleEditName();
                else if (editType === "purchase") handleEditPurchase();
                else if (editType === "payment") handleEditPayment();
              }}
            >
              حفظ التغييرات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذا العنصر؟ هذا الإجراء لا يمكن التراجع عنه.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SearchCustomer;
