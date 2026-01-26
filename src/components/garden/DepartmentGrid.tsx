import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";

interface Department {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  description: string | null;
  brand_count?: number;
}

interface DepartmentGridProps {
  departments: Department[];
}

const DEPARTMENT_ICONS: Record<string, string> = {
  'fashion': '👗',
  'electronics': '📱',
  'home': '🏠',
  'beauty': '💄',
  'sports': '⚽',
  'food': '🍕',
  'travel': '✈️',
  'health': '💊',
  'pets': '🐾',
  'automotive': '🚗',
  'office': '💼',
  'kids': '🧸',
  'outdoors': '🏕️',
  'entertainment': '🎬',
  'services': '🛠️',
};

export const DepartmentGrid = ({ departments }: DepartmentGridProps) => {
  return (
    <section className="mb-8">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-foreground">🏬 Shop by Department</h2>
        <p className="text-sm text-muted-foreground">Browse by category</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {departments.map((dept) => (
          <Link key={dept.id} to={`/garden/category/${dept.slug}`}>
            <Card className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer h-full">
              <CardContent className="p-4 text-center">
                <div className="text-3xl mb-2">
                  {dept.icon || DEPARTMENT_ICONS[dept.slug] || '📦'}
                </div>
                <h3 className="font-medium text-foreground text-sm mb-1">
                  {dept.name}
                </h3>
                {dept.brand_count !== undefined && (
                  <p className="text-xs text-muted-foreground">
                    {dept.brand_count.toLocaleString()} brands
                  </p>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default DepartmentGrid;
