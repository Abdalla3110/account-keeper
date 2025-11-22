-- Create customers table
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  total_debt DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create purchases table
CREATE TABLE public.purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
  items JSONB NOT NULL,
  purchase_total DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create payments table
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
  amount_paid DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_customers_name ON public.customers(name);
CREATE INDEX idx_purchases_customer_id ON public.purchases(customer_id);
CREATE INDEX idx_payments_customer_id ON public.payments(customer_id);

-- Enable RLS (for future if needed)
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since this is a single-user system)
CREATE POLICY "Allow all access to customers" ON public.customers FOR ALL USING (true);
CREATE POLICY "Allow all access to purchases" ON public.purchases FOR ALL USING (true);
CREATE POLICY "Allow all access to payments" ON public.payments FOR ALL USING (true);