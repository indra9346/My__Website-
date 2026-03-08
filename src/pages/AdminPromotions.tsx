
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Pencil, Trash2, Plus, Megaphone } from "lucide-react";

type Promotion = {
  id: string;
  title: string;
  description: string;
  offer_text: string | null;
  discount_percentage: number | null;
  cta_text: string;
  cta_link: string;
  bg_image: string | null;
  active: boolean;
  start_date: string | null;
  end_date: string | null;
  display_order: number;
  created_at: string;
};

type PromoForm = {
  title: string;
  description: string;
  offer_text: string;
  discount_percentage: string;
  cta_text: string;
  cta_link: string;
  bg_image: string;
  active: boolean;
  start_date: string;
  end_date: string;
};

const emptyForm: PromoForm = {
  title: "",
  description: "",
  offer_text: "",
  discount_percentage: "",
  cta_text: "Contact Now",
  cta_link: "#contact",
  bg_image: "",
  active: true,
  start_date: "",
  end_date: "",
};

const AdminPromotions = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null);
  const [form, setForm] = useState<PromoForm>(emptyForm);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const { data: promotions, isLoading } = useQuery({
    queryKey: ["admin-promotions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("promotions")
        .select("*")
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data as unknown as Promotion[];
    },
  });

  const buildPayload = (f: PromoForm) => ({
    title: f.title,
    description: f.description,
    offer_text: f.offer_text || null,
    discount_percentage: f.discount_percentage ? parseInt(f.discount_percentage) : null,
    cta_text: f.cta_text,
    cta_link: f.cta_link,
    bg_image: f.bg_image || null,
    active: f.active,
    start_date: f.start_date || null,
    end_date: f.end_date || null,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = buildPayload(form);
      if (isAdding) {
        const maxOrder = promotions ? Math.max(0, ...promotions.map((p) => p.display_order || 0)) : 0;
        const { error } = await supabase.from("promotions").insert([{ ...payload, display_order: maxOrder + 1 } as any]);
        if (error) throw error;
      } else if (editingPromo) {
        const { error } = await supabase.from("promotions").update(payload as any).eq("id", editingPromo.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-promotions"] });
      queryClient.invalidateQueries({ queryKey: ["promotions"] });
      toast({ title: "Success", description: isAdding ? "Promotion added" : "Promotion updated" });
      closeSheet();
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("promotions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-promotions"] });
      queryClient.invalidateQueries({ queryKey: ["promotions"] });
      toast({ title: "Deleted", description: "Promotion removed" });
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("promotions").update({ active } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-promotions"] });
      queryClient.invalidateQueries({ queryKey: ["promotions"] });
    },
  });

  const closeSheet = () => {
    setIsSheetOpen(false);
    setEditingPromo(null);
    setIsAdding(false);
    setForm(emptyForm);
  };

  const openAdd = () => {
    setIsAdding(true);
    setForm(emptyForm);
    setIsSheetOpen(true);
  };

  const openEdit = (p: Promotion) => {
    setIsAdding(false);
    setEditingPromo(p);
    setForm({
      title: p.title,
      description: p.description,
      offer_text: p.offer_text || "",
      discount_percentage: p.discount_percentage?.toString() || "",
      cta_text: p.cta_text,
      cta_link: p.cta_link,
      bg_image: p.bg_image || "",
      active: p.active,
      start_date: p.start_date ? p.start_date.slice(0, 16) : "",
      end_date: p.end_date ? p.end_date.slice(0, 16) : "",
    });
    setIsSheetOpen(true);
  };

  const inputClass = "w-full px-4 py-2 bg-gray-900/50 border border-border rounded-lg focus:outline-none focus:border-[hsl(var(--primary))] text-foreground";

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <Megaphone className="w-6 h-6 text-[hsl(var(--primary))]" />
          <h2 className="text-2xl font-bold">Manage Promotions</h2>
        </div>
        <Button onClick={openAdd} className="bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/80 text-primary-foreground">
          <Plus className="w-4 h-4 mr-2" /> Add Promotion
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[hsl(var(--primary))]" />
        </div>
      ) : !promotions?.length ? (
        <div className="glass rounded-lg p-12 text-center text-muted-foreground">
          No promotions yet. Click "Add Promotion" to create your first one.
        </div>
      ) : (
        <div className="space-y-4">
          {promotions.map((p) => (
            <div key={p.id} className="glass rounded-lg p-5 flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-bold text-foreground truncate">{p.title}</h3>
                  {p.offer_text && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[hsl(var(--primary))]/20 text-[hsl(var(--primary))]">
                      {p.offer_text}
                    </span>
                  )}
                  {p.discount_percentage && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[hsl(var(--accent))]/20 text-[hsl(var(--accent))]">
                      {p.discount_percentage}% OFF
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground truncate">{p.description}</p>
                {(p.start_date || p.end_date) && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {p.start_date && `From: ${new Date(p.start_date).toLocaleDateString()}`}
                    {p.start_date && p.end_date && " — "}
                    {p.end_date && `Until: ${new Date(p.end_date).toLocaleDateString()}`}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{p.active ? "Active" : "Inactive"}</span>
                  <Switch
                    checked={p.active}
                    onCheckedChange={(checked) => toggleMutation.mutate({ id: p.id, active: checked })}
                  />
                </div>
                <Button variant="outline" size="sm" onClick={() => openEdit(p)}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => { if (confirm("Delete this promotion?")) deleteMutation.mutate(p.id); }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Sheet open={isSheetOpen} onOpenChange={(o) => !o && closeSheet()}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{isAdding ? "Add Promotion" : "Edit Promotion"}</SheetTitle>
          </SheetHeader>
          <form
            onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }}
            className="space-y-4 mt-6"
          >
            <div>
              <label className="block mb-1.5 text-sm font-medium">Title *</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputClass} required />
            </div>
            <div>
              <label className="block mb-1.5 text-sm font-medium">Description *</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className={inputClass} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block mb-1.5 text-sm font-medium">Offer Label</label>
                <input value={form.offer_text} onChange={(e) => setForm({ ...form, offer_text: e.target.value })} className={inputClass} placeholder="e.g. Limited Offer" />
              </div>
              <div>
                <label className="block mb-1.5 text-sm font-medium">Discount %</label>
                <input type="number" min="0" max="100" value={form.discount_percentage} onChange={(e) => setForm({ ...form, discount_percentage: e.target.value })} className={inputClass} placeholder="20" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block mb-1.5 text-sm font-medium">CTA Text *</label>
                <input value={form.cta_text} onChange={(e) => setForm({ ...form, cta_text: e.target.value })} className={inputClass} required />
              </div>
              <div>
                <label className="block mb-1.5 text-sm font-medium">CTA Link *</label>
                <input value={form.cta_link} onChange={(e) => setForm({ ...form, cta_link: e.target.value })} className={inputClass} required />
              </div>
            </div>
            <div>
              <label className="block mb-1.5 text-sm font-medium">Background Image URL</label>
              <input value={form.bg_image} onChange={(e) => setForm({ ...form, bg_image: e.target.value })} className={inputClass} placeholder="https://..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block mb-1.5 text-sm font-medium">Start Date</label>
                <input type="datetime-local" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className="block mb-1.5 text-sm font-medium">End Date</label>
                <input type="datetime-local" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className={inputClass} />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.active} onCheckedChange={(checked) => setForm({ ...form, active: checked })} />
              <span className="text-sm">{form.active ? "Active" : "Inactive"}</span>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={closeSheet}>Cancel</Button>
              <Button type="submit" className="bg-[hsl(var(--primary))] text-primary-foreground" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving..." : isAdding ? "Add Promotion" : "Save Changes"}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default AdminPromotions;
