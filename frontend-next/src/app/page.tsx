"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import dynamic from "next/dynamic";
import { motion } from "framer-motion"; // npm install framer-motion

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

interface MetaData {
  categories: string[];
  regions: string[];
  years: number[];
}

interface SummaryData {
  total_sales: number;
  total_profit: number;
  avg_order_value: number;
  orders: number;
}

interface CategoryData {
  Category: string;
  Sales: number;
  Profit: number;
}

interface RegionData {
  Region: string;
  Sales: number;
}

interface TrendRecord {
  Month: string;
  Sales: number;
}

type TrendData = Record<string, TrendRecord[]>;

const BACKEND_BASE = "https://backend-global-sales.onrender.com";



/* 🔥 Glass Card Style */
const glassCard: React.CSSProperties = {
  flex: "1 1 calc(50% - 16px)",
  padding: 12,
  borderRadius: 8,
  background: "rgba(255, 255, 255, 0.1)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border: "1px solid rgba(255, 255, 255, 0.3)",
  color: "white",
  boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
};

/* 🎯 Components */
const PageHeading = () => (
  <motion.div
    initial={{ opacity: 0, y: -20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.8 }}
    style={{
      textAlign: "center",
      padding: "20px",
      marginBottom: "16px",
      borderRadius: "16px",
      background: "rgba(255, 255, 255, 0.15)",
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      border: "1px solid rgba(255, 255, 255, 0.3)",
      boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
    }}
  >
    <h1
      style={{
        fontSize: "clamp(1.8rem, 3vw, 3rem)",
        fontWeight: "bold",
        background: "linear-gradient(90deg, #ff7eb3, #ff758c, #ffce00)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        margin: 0,
      }}
    >
      📊 Global Sales Dashboard
    </h1>
    <p
      style={{
        fontSize: "clamp(0.9rem, 1.5vw, 1.1rem)",
        color: "rgba(255, 255, 255, 0.85)",
        marginTop: "8px",
      }}
    >
      Real-time insights powered by FastAPI & Next.js
    </p>
  </motion.div>
);

const ChartSection = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <motion.section
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.6 }}
    style={{
      marginBottom: 20,
      padding: 16,
      borderRadius: 6,
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      border: "1px solid rgba(255, 255, 255, 0.2)",
      boxShadow: "0 4px 20px rgba(0, 0, 0, 0.31)",
      background: "rgba(255, 255, 255, 0.1)",
    }}
  >
    <h3 style={{ color: "black", marginBottom: "10px" }}>{title}</h3>
    {children}
  </motion.section>
);

const AnimatedCard = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
    whileHover={{ scale: 1.03 }}
    style={glassCard}
  >
    {children}
  </motion.div>
);

export default function Page() {
  const [meta, setMeta] = useState<MetaData>({
    categories: [],
    regions: [],
    years: [],
  });
  const [filters, setFilters] = useState({
    categories: [] as string[],
    regions: [] as string[],
    years: [] as number[],
  });
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [catData, setCatData] = useState<CategoryData[]>([]);
  const [regData, setRegData] = useState<RegionData[]>([]);
  const [trendData, setTrendData] = useState<TrendData>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    axios
      .get(`${BACKEND_BASE}/api/metadata`)
      .then((res) => {
        setMeta(res.data);
        setFilters({
          categories: res.data.categories,
          regions: res.data.regions,
          years: res.data.years,
        });
      })
      .catch((err) => {
        console.error("Failed to fetch metadata:", err);
      });
  }, []);

  useEffect(() => {
    if (!filters.categories.length) return;
    setLoading(true);
    const body = {
      categories: filters.categories.length ? filters.categories : null,
      regions: filters.regions.length ? filters.regions : null,
      years: filters.years.length ? filters.years : null,
    };
    axios
      .post(`${BACKEND_BASE}/api/summary`, body)
      .then((r) => setSummary(r.data))
      .catch(() => {});
    axios
      .post(`${BACKEND_BASE}/api/sales_by_category`, body)
      .then((r) => setCatData(r.data.data || []))
      .catch(() => {});
    axios
      .post(`${BACKEND_BASE}/api/sales_by_region`, body)
      .then((r) => setRegData(r.data.data || []))
      .catch(() => {});
    axios
      .post(`${BACKEND_BASE}/api/monthly_trend`, body)
      .then((r) => setTrendData(r.data.data || {}))
      .catch(() => {});
    setLoading(false);
  }, [filters]);

  const toggleSelectAll = (key: keyof MetaData) => {
    setFilters((prev) => {
      const allSelected = prev[key].length === meta[key].length;
      return {
        ...prev,
        [key]: allSelected ? [] : [...meta[key]],
      } as typeof prev;
    });
  };

  const toggleItem = (
    key: "categories" | "regions" | "years",
    item: string | number
  ) => {
    setFilters((prev) => {
      const set = new Set(prev[key] as (string | number)[]);
      if (set.has(item)) set.delete(item);
      else set.add(item);
      return { ...prev, [key]: Array.from(set) as any };
    });
  };

  const downloadCSV = () => {
    window.open(`${BACKEND_BASE}/api/download`, "_blank");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: 24,
        fontFamily: "Arial, sans-serif",
        background: "linear-gradient(140deg, #0f3443 0%, #34e89e 50%, #ff6e7f 100%)",
      }}
    >
      <PageHeading />

      <div
        style={{
          display: "flex",
          gap: 24,
          marginTop: 24,
          maxWidth: 1400,
          marginInline: "auto",
          flexWrap: "wrap",
        }}
      >
        {/* Sidebar Filters */}
        <motion.aside
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          style={{
            flex: "1 1 280px",
            padding: 16,
            borderRadius: 16,
            background: "rgba(0, 0, 0, 0.2)",
            color: "white",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border: "1px solid rgba(255, 255, 255, 0.3)",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
          }}
        >
          <h3 style={{ marginBottom: 12 }}>Filters</h3>

          {(["categories", "regions", "years"] as (keyof MetaData)[]).map(
            (filterKey) => (
              <div
                key={filterKey}
                style={{
                  marginBottom: 20,
                  borderRadius: 16,
                  padding: 10,
                  background: "rgba(0, 0, 0, 0.2)",
                  border: "1px solid rgba(255, 255, 255, 0.3)",
                }}
              >
                <strong style={{ textTransform: "capitalize" }}>
                  {filterKey}
                </strong>
                <div>
                  <button
                    onClick={() => toggleSelectAll(filterKey)}
                    style={{
                      marginTop: 4,
                      marginBottom: 8,
                      padding: "4px 8px",
                      fontSize: 12,
                      cursor: "pointer",
                      borderRadius: 4,
                    }}
                  >
                    {filters[filterKey].length === meta[filterKey].length
                      ? "Unselect all"
                      : "Select all"}
                  </button>
                </div>
                <div
                  style={{
                    maxHeight: 120,
                    overflowY: "scroll",
                    scrollbarWidth: "none",
                    msOverflowStyle: "none",
                  }}
                >
                  {meta[filterKey].map((val) => (
                    <label
                      key={val.toString()}
                      style={{ display: "block", marginBottom: 4 }}
                    >
                      <input
                        type="checkbox"
                        checked={filters[filterKey].includes(val as never)}
                        onChange={() => toggleItem(filterKey, val)}
                      />{" "}
                      {val}
                    </label>
                  ))}
                </div>
              </div>
            )
          )}

          <div style={{ marginTop: 12 }}>
            <button
              onClick={downloadCSV}
              style={{
                color: "white",
                background: "#4caf4fa2",
                padding: "6px 12px",
                borderRadius: 6,
                cursor: "pointer",
                border: "1px solid rgba(255, 255, 255, 0.2)",
              }}
            >
              ⬇ Download CSV
            </button>
          </div>
        </motion.aside>

        {/* Main Content */}
        <main style={{ flex: "3 1 700px" }}>
          {/* Overview */}
          <motion.section initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            style={{ marginBottom: 20 }}>
            <h2>Overview</h2>
            {loading && <div>Loading...</div>}
            {summary && (
              <div
                style={{
                  display: "flex",
                  gap: 16,
                  flexWrap: "wrap",
                }}
              >
                <AnimatedCard>
                  💰 <strong>Total Sales:</strong> $
                  {Math.round(summary.total_sales).toLocaleString()}
                </AnimatedCard>
                <AnimatedCard>
                  📦 <strong>Avg Order:</strong> $
                  {summary.avg_order_value.toFixed(2)}
                </AnimatedCard>
                <AnimatedCard>
                  🛒 <strong>Orders:</strong> {summary.orders}
                </AnimatedCard>
                <AnimatedCard>
                  📈 <strong>Total Profit:</strong> $
                  {Math.round(summary.total_profit).toLocaleString()}
                </AnimatedCard>
              </div>
            )}
          </motion.section>

          {/* Sales by Category */}
          <ChartSection title="Sales by Category">
            <Plot
              data={[
                {
                  x: catData.map((d) => d.Category),
                  y: catData.map((d) => d.Sales),
                  type: "bar",
                  marker: { color: "blueviolet" },
                },
              ]}
              layout={{
                autosize: true,
                title: { text: "", font: { color: "black" } },
              }}
              style={{ width: "100%", height: 400 }}
            />
          </ChartSection>

          {/* Sales by Region */}
          <ChartSection title="Sales by Region">
            <Plot
              data={[
                {
                  labels: regData.map((d) => d.Region),
                  values: regData.map((d) => d.Sales),
                  type: "pie",
                  hole: 0.3,
                },
              ]}
              layout={{ autosize: true }}
              style={{ width: "100%", height: 400 }}
            />
          </ChartSection>

          {/* Monthly Trend */}
          <ChartSection title="Monthly Trend">
            <Plot
              data={Object.keys(trendData).map((year) => ({
                x: trendData[year].map((r) => r.Month),
                y: trendData[year].map((r) => r.Sales),
                mode: "lines+markers",
                name: year,
              }))}
              layout={{ autosize: true }}
              style={{ width: "100%", height: 420 }}
            />
          </ChartSection>
        </main>
      </div>

      <footer
        style={{
          marginTop: 32,
          textAlign: "center",
          color: "#555",
        }}
      >
        <hr />
        <small>
          Project by <strong>Nikhil Tanwar</strong> — Backend: FastAPI, Frontend:
          Next.js + Plotly
        </small>
      </footer>
    </div>
  );
}
