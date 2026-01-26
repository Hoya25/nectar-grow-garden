import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";

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
  const sectionRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section 
      ref={sectionRef}
      className={`garden-theme mb-8 garden-fade-in ${isVisible ? 'visible' : ''}`}
    >
      <div className="border-b border-[hsl(220,13%,91%)] pb-3 mb-4">
        <h2 className="text-xl font-bold text-[hsl(0,0%,10%)]">🏬 Shop by Department</h2>
        <p className="text-sm text-[hsl(220,9%,46%)] mt-1">Browse by category</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {departments.map((dept, index) => (
          <Link 
            key={dept.id} 
            to={`/garden/category/${dept.slug}`}
            style={{ 
              animationDelay: `${index * 50}ms`,
              opacity: isVisible ? 1 : 0,
              transition: `opacity 0.3s ease ${index * 50}ms`
            }}
          >
            <div className="bg-white rounded-xl p-4 text-center border border-[hsl(220,13%,91%)] shadow-sm hover:shadow-md hover:border-[hsl(142,71%,45%)] hover:bg-[hsl(142,76%,97%)] transition-all duration-200 h-full cursor-pointer">
              <div className="text-3xl mb-2">
                {dept.icon || DEPARTMENT_ICONS[dept.slug] || '📦'}
              </div>
              <h3 className="font-medium text-[hsl(0,0%,10%)] text-sm mb-1">
                {dept.name}
              </h3>
              {dept.brand_count !== undefined && (
                <p className="text-xs text-[hsl(220,9%,46%)]">
                  {dept.brand_count.toLocaleString()} brands
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default DepartmentGrid;
