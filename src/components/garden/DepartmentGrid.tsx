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

  // Intersection Observer for fade-in animation
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
      <div className="garden-section-header">
        <h2 className="text-xl font-bold garden-text">🏬 Shop by Department</h2>
        <p className="text-sm garden-text-muted mt-1">Browse by category</p>
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
            <div className="garden-card rounded-xl p-4 text-center garden-card-hover h-full cursor-pointer">
              <div className="text-3xl mb-2">
                {dept.icon || DEPARTMENT_ICONS[dept.slug] || '📦'}
              </div>
              <h3 className="font-medium garden-text text-sm mb-1">
                {dept.name}
              </h3>
              {dept.brand_count !== undefined && (
                <p className="text-xs garden-text-muted">
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
