"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useSpring, useTransform } from "framer-motion";

interface LiveCounterProps {
  value: number;
  label: string;
  color?: string;
  suffix?: string;
  decimals?: number;
}

export default function LiveCounter({
  value,
  label,
  color = "text-foreground",
  suffix = "",
  decimals = 0,
}: LiveCounterProps) {
  const spring = useSpring(0, { stiffness: 100, damping: 20 });
  const display = useTransform(spring, (v) =>
    decimals > 0 ? v.toFixed(decimals) : Math.round(v).toLocaleString()
  );
  const [displayValue, setDisplayValue] = useState("0");

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  useEffect(() => {
    const unsubscribe = display.on("change", (v) => setDisplayValue(v));
    return unsubscribe;
  }, [display]);

  return (
    <div className="text-center">
      <motion.div
        className={`text-3xl font-bold tabular-nums ${color}`}
        key={value}
        initial={{ scale: 1.15 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 300 }}
      >
        {displayValue}
        {suffix}
      </motion.div>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
}
