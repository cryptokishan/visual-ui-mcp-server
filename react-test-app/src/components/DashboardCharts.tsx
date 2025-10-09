import type { FunctionComponent } from "react";
import { useTheme } from "../contexts/ThemeContext";
import { type Product } from "../types";

export const PostsActivityChart: FunctionComponent = () => {
  const { theme } = useTheme();
  const dataPointFill = theme === "dark" ? "#60a5fa" : "#3b82f6";
  return (
    <svg viewBox="0 0 120 60" className="w-full h-full">
      {/* Background */}
      <rect x="0" y="0" width="120" height="60" fill="transparent" />

      {/* Grid lines */}
      <line
        x1="10"
        y1="50"
        x2="110"
        y2="50"
        stroke="currentColor"
        strokeOpacity="0.1"
        strokeWidth="0.5"
      />
      <line
        x1="10"
        y1="40"
        x2="110"
        y2="40"
        stroke="currentColor"
        strokeOpacity="0.1"
        strokeWidth="0.5"
      />
      <line
        x1="10"
        y1="30"
        x2="110"
        y2="30"
        stroke="currentColor"
        strokeOpacity="0.1"
        strokeWidth="0.5"
      />
      <line
        x1="10"
        y1="20"
        x2="110"
        y2="20"
        stroke="currentColor"
        strokeOpacity="0.1"
        strokeWidth="0.5"
      />
      <line
        x1="10"
        y1="10"
        x2="110"
        y2="10"
        stroke="currentColor"
        strokeOpacity="0.1"
        strokeWidth="0.5"
      />

      {/* Line chart path */}
      <path
        d="M10,50 L25,45 L40,35 L55,25 L70,20 L85,15 L100,10 L110,8"
        fill="none"
        stroke="url(#postsGradient)"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Data points */}
      <circle cx="25" cy="45" r="1.5" fill={dataPointFill} />
      <circle cx="40" cy="35" r="1.5" fill={dataPointFill} />
      <circle cx="55" cy="25" r="1.5" fill={dataPointFill} />
      <circle cx="70" cy="20" r="1.5" fill={dataPointFill} />
      <circle cx="85" cy="15" r="1.5" fill={dataPointFill} />
      <circle cx="100" cy="10" r="1.5" fill={dataPointFill} />
      <circle cx="110" cy="8" r="2" fill={dataPointFill} />

      {/* Gradient definition */}
      <defs>
        <linearGradient id="postsGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={dataPointFill} stopOpacity="0.3" />
          <stop offset="100%" stopColor={dataPointFill} stopOpacity="1" />
        </linearGradient>
      </defs>
    </svg>
  );
};

export const ProductsRevenueChart: FunctionComponent<{
  products: Product[];
}> = ({ products }) => {
  const { theme } = useTheme();
  const centerFill = theme === "dark" ? "#374151" : "white";
  const gray = theme === "dark" ? "#6b7280" : "#e5e7eb";

  // Calculate product categories distribution
  const categories =
    products?.reduce((acc: Record<string, number>, product) => {
      acc[product.category] = (acc[product.category] || 0) + 1;
      return acc;
    }, {}) || {};

  const totalProducts = products?.length || 1;
  const electronicsPercent =
    ((categories.electronics || 0) / totalProducts) * 100;
  const booksPercent = ((categories.books || 0) / totalProducts) * 100;

  return (
    <svg viewBox="0 0 120 60" className="w-full h-full">
      {/* Background */}
      <rect x="0" y="0" width="120" height="60" fill="transparent" />

      {/* Pie chart segments */}
      {/* Electronics - Green */}
      <path
        d={`M40,30 L40,15 A25,25 0 ${electronicsPercent > 50 ? 1 : 0} 1 ${
          40 + 25 * Math.cos(((electronicsPercent / 100) * 360 * Math.PI) / 180)
        },${
          30 - 25 * Math.sin(((electronicsPercent / 100) * 360 * Math.PI) / 180)
        } Z`}
        fill="#10b981"
      />
      {/* Books - Purple */}
      <path
        d={`M40,30 L${
          40 + 25 * Math.cos(((electronicsPercent / 100) * 360 * Math.PI) / 180)
        },${
          30 - 25 * Math.sin(((electronicsPercent / 100) * 360 * Math.PI) / 180)
        } A25,25 0 ${booksPercent > 50 ? 1 : 0} 1 ${
          40 +
          25 *
            Math.cos(
              (((electronicsPercent + booksPercent) / 100) * 360 * Math.PI) /
                180
            )
        },${
          30 -
          25 *
            Math.sin(
              (((electronicsPercent + booksPercent) / 100) * 360 * Math.PI) /
                180
            )
        } Z`}
        fill="#8b5cf6"
      />
      {/* Others - Gray */}
      <path
        d={`M40,30 L${
          40 +
          25 *
            Math.cos(
              (((electronicsPercent + booksPercent) / 100) * 360 * Math.PI) /
                180
            )
        },${
          30 -
          25 *
            Math.sin(
              (((electronicsPercent + booksPercent) / 100) * 360 * Math.PI) /
                180
            )
        } A25,25 0 0 1 ${40 + 25 * Math.cos((350 * Math.PI) / 180)},${
          30 - 25 * Math.sin((350 * Math.PI) / 180)
        } Z`}
        fill={gray}
      />

      {/* Center circle */}
      <circle
        cx="40"
        cy="30"
        r="12"
        fill={centerFill}
        stroke={gray}
        strokeWidth="1"
      />

      {/* Legend */}
      <circle cx="75" cy="15" r="3" fill="#10b981" />
      <text x="85" y="18" fontSize="8" fill={theme === "dark" ? "#ffffff" : "#1f2937"}>
        Electronics
      </text>

      <circle cx="75" cy="30" r="3" fill="#8b5cf6" />
      <text x="85" y="33" fontSize="8" fill={theme === "dark" ? "#ffffff" : "#1f2937"}>
        Books
      </text>

      <circle cx="75" cy="45" r="3" fill={gray} />
      <text x="85" y="48" fontSize="8" fill={theme === "dark" ? "#ffffff" : "#1f2937"}>
        Others
      </text>
    </svg>
  );
};

export const UsersGrowthChart: FunctionComponent = () => {
  const { theme } = useTheme();
  const lightGray = theme === "dark" ? "#6b7280" : "#e5e7eb";
  return (
    <svg viewBox="0 0 120 60" className="w-full h-full">
      {/* Background */}
      <rect x="0" y="0" width="120" height="60" fill="transparent" />

      {/* Bars representing user growth */}
      <rect x="15" y="35" width="8" height="20" fill="#a855f7" rx="2" />
      <rect x="28" y="30" width="8" height="25" fill="#a855f7" rx="2" />
      <rect x="41" y="25" width="8" height="30" fill="#a855f7" rx="2" />
      <rect x="54" y="20" width="8" height="35" fill="#a855f7" rx="2" />
      <rect x="67" y="15" width="8" height="40" fill="#a855f7" rx="2" />
      <rect x="80" y="10" width="8" height="45" fill="#a855f7" rx="2" />
      <rect
        x="93"
        y="8"
        width="8"
        height="47"
        fill="url(#usersGradient)"
        rx="2"
      />

      {/* Growth arrows */}
      <path
        d="M15,35 L20,30 M18,32 L20,30 L18,28"
        stroke="#10b981"
        strokeWidth="1.5"
        fill="none"
      />

      {/* User avatars represented as small circles */}
      <circle cx="19" cy="55" r="1.5" fill={lightGray} />
      <circle cx="25" cy="55" r="1.5" fill={lightGray} />
      <circle cx="31" cy="55" r="1.5" fill={lightGray} />

      {/* Trend line */}
      <path
        d="M23,50 L36,45 L49,40 L62,35 L75,30 L88,25 L101,20"
        fill="none"
        stroke="#10b981"
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      {/* Gradient definition */}
      <defs>
        <linearGradient id="usersGradient" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#c084fc" />
        </linearGradient>
      </defs>
    </svg>
  );
};
