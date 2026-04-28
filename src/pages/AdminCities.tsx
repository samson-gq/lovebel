import { useEffect, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface City {
  id: string;
  name: string;
  display_order: number;
}

const AdminCities = () => {
  const { isAdmin, loading: roleLoading } = useIsAdmin();
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newOrder, setNewOrder] = useState<number>(100);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("popular_cities")
      .select("id, name, display_order")
      .order("display_order", { ascending: true });
    if (error) {
      toast.error("Не удалось загрузить города");
    } else {
      setCities(data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  if (roleLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }
  if (!isAdmin) return <Navigate to="/" replace />;

  const addCity = async () => {
    const name = newName.trim();
    if (!name) return;
    setSaving(true);
    const { error } = await supabase
      .from("popular_cities")
      .insert({ name, display_order: newOrder });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setNewName("");
    setNewOrder(100);
    toast.success("Город добавлен");
    load();
  };

  const updateCity = async (c: City) => {
    setSaving(true);
    const { error } = await supabase
      .from("popular_cities")
      .update({ name: c.name.trim(), display_order: c.display_order })
      .eq("id", c.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Сохранено");
    load();
  };

  const deleteCity = async (id: string) => {
    if (!confirm("Удалить город?")) return;
    const { error } = await supabase.from("popular_cities").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Удалено");
    setCities((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-card/95 px-4 py-3 backdrop-blur">
        <Link to="/" className="rounded-full p-2 hover:bg-muted" aria-label="Назад">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-semibold text-card-foreground">Популярные города</h1>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6">
        <section className="mb-6 rounded-2xl bg-card p-4 shadow-card">
          <h2 className="mb-3 text-sm font-semibold text-card-foreground">Добавить город</h2>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              placeholder="Название (например, Москва)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="flex-1"
            />
            <Input
              type="number"
              placeholder="Порядок"
              value={newOrder}
              onChange={(e) => setNewOrder(Number(e.target.value) || 0)}
              className="sm:w-32"
            />
            <Button onClick={addCity} disabled={saving || !newName.trim()}>
              <Plus className="mr-1 h-4 w-4" />
              Добавить
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Меньше «Порядок» — выше в списке автоподстановки.
          </p>
        </section>

        <section className="rounded-2xl bg-card p-4 shadow-card">
          <h2 className="mb-3 text-sm font-semibold text-card-foreground">
            Список ({cities.length})
          </h2>
          {loading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Загрузка…</p>
          ) : cities.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Список пуст</p>
          ) : (
            <ul className="space-y-2">
              {cities.map((c, idx) => (
                <li
                  key={c.id}
                  className="flex flex-col gap-2 rounded-xl border border-border p-3 sm:flex-row sm:items-center"
                >
                  <Input
                    value={c.name}
                    onChange={(e) => {
                      const v = e.target.value;
                      setCities((prev) => prev.map((x, i) => (i === idx ? { ...x, name: v } : x)));
                    }}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    value={c.display_order}
                    onChange={(e) => {
                      const v = Number(e.target.value) || 0;
                      setCities((prev) =>
                        prev.map((x, i) => (i === idx ? { ...x, display_order: v } : x)),
                      );
                    }}
                    className="sm:w-28"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => updateCity(c)} disabled={saving}>
                      <Save className="mr-1 h-4 w-4" />
                      Сохранить
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteCity(c.id)}
                      aria-label={`Удалить ${c.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
};

export default AdminCities;
