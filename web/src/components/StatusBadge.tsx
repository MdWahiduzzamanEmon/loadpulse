"use client";

import { motion } from "framer-motion";

interface StatusBadgeProps {
  status: number;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const isSuccess = status >= 200 && status < 400;
  const isClientError = status >= 400 && status < 500;
  const isServerError = status >= 500 || status === 0;

  const color = isSuccess
    ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30"
    : isClientError
      ? "bg-amber-500/15 text-amber-500 border-amber-500/30"
      : "bg-red-500/15 text-red-500 border-red-500/30";

  const label = status === 0 ? "T/O" : String(status);

  return (
    <motion.span
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-semibold border ${color}`}
    >
      {label}
    </motion.span>
  );
}
