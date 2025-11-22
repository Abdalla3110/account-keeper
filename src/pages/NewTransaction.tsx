import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowRight, Plus, Trash2 } from "lucide-react";

interface Item {
  name: string;
  price: number;
}

const NewTransaction = () => {
  const navigate = useNavigate();
  const [customerName, setCustomerName] = useState("");
  const [items, setItems] = useState<Item[]>([{ name: "", price: 0 }]);
  const [loading, setLoading] = useState(false);

  const addItem = () => {
    setItems([...items, { name: "", price: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof Item, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + Number(item.price || 0), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim()) {
      toast.error("الرجاء إدخال اسم العميل");
      return;
    }

    const validItems = items.filter((item) => item.name.trim() && item.price > 0);
    if (validItems.length === 0) {
      toast.error("الرجاء إضافة منتج واحد على الأقل");
      return;
    }

    setLoading(true);

    try {
      const total = calculateTotal();

      // Check if customer exists
      const { data: existingCustomers } = await supabase
        .from("customers")
        .select("*")
        .ilike("name", customerName.trim())
        .limit(1);

      let customerId: string;

      if (existingCustomers && existingCustomers.length > 0) {
        // Update existing customer
        const customer = existingCustomers[0];
        customerId = customer.id;

        const newTotalDebt = Number(customer.total_debt) + total;

        const { error: updateError } = await supabase
          .from("customers")
          .update({ total_debt: newTotalDebt })
          .eq("id", customerId);

        if (updateError) throw updateError;
      } else {
        // Create new customer
        const { data: newCustomer, error: createError } = await supabase
          .from("customers")
          .insert({ name: customerName.trim(), total_debt: total })
          .select()
          .single();

        if (createError) throw createError;
        customerId = newCustomer.id;
      }

      // Add purchase record
      const { error: purchaseError } = await supabase.from("purchases").insert({
        customer_id: customerId,
        items: validItems as any,
        purchase_total: total,
      });

      if (purchaseError) throw purchaseError;

      toast.success("تم إضافة المعاملة بنجاح");
      navigate("/search-customer", { state: { customerName } });
    } catch (error) {
      console.error("Error adding transaction:", error);
      toast.error("حدث خطأ أثناء إضافة المعاملة");
    } finally {
      setLoading(false);
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
            <h1 className="text-2xl font-bold">إضافة معاملة جديدة</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <Card className="p-6 shadow-card animate-fade-in">
          <form onSubmit={handleSubmit}>
            {/* Customer Name */}
            <div className="mb-6">
              <Label htmlFor="customerName" className="text-base font-semibold">
                اسم العميل
              </Label>
              <Input
                id="customerName"
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="أدخل اسم العميل"
                className="mt-2 text-lg"
                required
              />
              <p className="text-sm text-muted-foreground mt-1">
                إذا كان العميل موجود، ستضاف المشتريات لحسابه تلقائياً
              </p>
            </div>

            {/* Items */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-base font-semibold">المنتجات</Label>
                <Button type="button" onClick={addItem} size="sm" variant="outline">
                  <Plus className="w-4 h-4 ml-1" />
                  إضافة منتج
                </Button>
              </div>

              <div className="space-y-3">
                {items.map((item, index) => (
                  <div key={index} className="flex gap-3 items-start">
                    <div className="flex-1">
                      <Input
                        type="text"
                        value={item.name}
                        onChange={(e) => updateItem(index, "name", e.target.value)}
                        placeholder="اسم المنتج"
                        required
                      />
                    </div>
                    <div className="w-32">
                      <Input
                        type="number"
                        value={item.price || ""}
                        onChange={(e) =>
                          updateItem(index, "price", parseFloat(e.target.value) || 0)
                        }
                        placeholder="السعر"
                        step="0.01"
                        min="0"
                        required
                      />
                    </div>
                    {items.length > 1 && (
                      <Button
                        type="button"
                        onClick={() => removeItem(index)}
                        size="icon"
                        variant="ghost"
                        className="text-danger hover:text-danger hover:bg-danger/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Total */}
            <div className="mb-6 p-4 bg-accent/50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold">الإجمالي:</span>
                <span className="text-2xl font-bold text-primary">
                  {calculateTotal().toFixed(2)} ج.م
                </span>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full gradient-primary text-lg h-12"
              disabled={loading}
            >
              {loading ? "جاري الحفظ..." : "حفظ المعاملة"}
            </Button>
          </form>
        </Card>
      </main>
    </div>
  );
};

export default NewTransaction;
