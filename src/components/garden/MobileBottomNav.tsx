import { useLocation, useNavigate } from "react-router-dom";
import { Home, Search, Tag, User } from "lucide-react";

interface MobileBottomNavProps {
  onSearchClick?: () => void;
  onTagsClick?: () => void;
}

export const MobileBottomNav = ({ 
  onSearchClick, 
  onTagsClick 
}: MobileBottomNavProps) => {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    {
      icon: Home,
      label: "Home",
      action: () => navigate("/garden"),
      active: isActive("/garden"),
    },
    {
      icon: Search,
      label: "Search",
      action: onSearchClick || (() => {}),
      active: false,
    },
    {
      icon: Tag,
      label: "Tags",
      action: onTagsClick || (() => {}),
      active: false,
    },
    {
      icon: User,
      label: "Profile",
      action: () => navigate("/profile"),
      active: isActive("/profile"),
    },
  ];

  return (
    <nav className="garden-theme garden-bottom-nav fixed bottom-0 left-0 right-0 h-[60px] md:hidden z-50 flex items-center justify-around px-4 safe-area-inset-bottom">
      {navItems.map((item) => (
        <button
          key={item.label}
          onClick={item.action}
          className={`garden-nav-item flex flex-col items-center justify-center gap-0.5 py-2 px-4 btn-press ${item.active ? 'active' : ''}`}
        >
          <item.icon className="h-5 w-5" />
          <span className="text-[10px] font-medium">{item.label}</span>
        </button>
      ))}
    </nav>
  );
};

export default MobileBottomNav;
