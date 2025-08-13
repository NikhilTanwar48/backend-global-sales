import os
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import pandas as pd

app = FastAPI(title="Global Sales API")

# === Config ===
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, "Sample - Superstore.csv")
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "*")

# === CORS ===
allow_origins = [FRONTEND_ORIGIN] if FRONTEND_ORIGIN != "*" else ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# === Global dataframe ===
df = pd.DataFrame()

def load_and_clean(path=DATA_PATH):
    if not os.path.exists(path):
        raise FileNotFoundError(f"Data file not found at {path}")
    df = pd.read_csv(path, encoding="latin-1")
    df.columns = df.columns.str.strip()
    if "Order Date" in df.columns:
        df["Order Date"] = pd.to_datetime(df["Order Date"], errors="coerce")
    if "Ship Date" in df.columns:
        df["Ship Date"] = pd.to_datetime(df["Ship Date"], errors="coerce")
    df = df.dropna(subset=["Order Date", "Sales"])
    df["Year"] = df["Order Date"].dt.year
    df["Month"] = df["Order Date"].dt.month_name()
    df["MonthNum"] = df["Order Date"].dt.month
    if "Order ID" not in df.columns:
        df["Order ID"] = df.index.astype(str)
    return df

@app.on_event("startup")
def startup_event():
    global df
    try:
        df = load_and_clean(DATA_PATH)
        print(f"✅ Loaded dataset: {len(df)} rows from '{DATA_PATH}'")
    except Exception as e:
        print(f"❌ Failed to load dataset: {e}")
        df = pd.DataFrame()

# === Utility ===
def apply_filters(dataframe, categories=None, regions=None, years=None):
    df_f = dataframe
    if categories:
        df_f = df_f[df_f["Category"].isin(categories)]
    if regions:
        df_f = df_f[df_f["Region"].isin(regions)]
    if years:
        df_f = df_f[df_f["Year"].isin([int(y) for y in years])]
    return df_f

# === Request Model ===
class FilterRequest(BaseModel):
    categories: Optional[List[str]] = None
    regions: Optional[List[str]] = None
    years: Optional[List[int]] = None

# === Endpoints ===
@app.get("/api/health")
def health():
    return {"status": "ok"}

@app.get("/api/metadata")
def metadata():
    if df.empty:
        return {"categories": [], "regions": [], "years": []}
    return {
        "categories": sorted(df["Category"].dropna().unique().tolist()),
        "regions": sorted(df["Region"].dropna().unique().tolist()),
        "years": sorted(df["Year"].dropna().astype(int).tolist())
    }

@app.post("/api/summary")
def summary(filters: FilterRequest):
    if df.empty:
        raise HTTPException(status_code=500, detail="Dataset not loaded on server.")
    filtered = apply_filters(df, filters.categories, filters.regions, filters.years)
    return {
        "total_sales": float(filtered["Sales"].sum()),
        "total_profit": float(filtered["Profit"].sum()) if "Profit" in filtered.columns else 0.0,
        "avg_order_value": float(filtered["Sales"].mean()) if not filtered["Sales"].empty else 0.0,
        "orders": int(filtered["Order ID"].nunique())
    }

@app.post("/api/sales_by_category")
def sales_by_category(filters: FilterRequest):
    if df.empty:
        raise HTTPException(status_code=500, detail="Dataset not loaded.")
    filtered = apply_filters(df, filters.categories, filters.regions, filters.years)
    agg = filtered.groupby("Category", as_index=False).agg({"Sales":"sum","Profit":"sum"})
    agg["Sales"] = agg["Sales"].astype(float)
    return {"data": agg.to_dict(orient="records")}

@app.post("/api/sales_by_region")
def sales_by_region(filters: FilterRequest):
    if df.empty:
        raise HTTPException(status_code=500, detail="Dataset not loaded.")
    filtered = apply_filters(df, filters.categories, filters.regions, filters.years)
    agg = filtered.groupby("Region", as_index=False).agg({"Sales":"sum"})
    agg["Sales"] = agg["Sales"].astype(float)
    return {"data": agg.to_dict(orient="records")}

@app.post("/api/monthly_trend")
def monthly_trend(filters: FilterRequest):
    if df.empty:
        raise HTTPException(status_code=500, detail="Dataset not loaded.")
    filtered = apply_filters(df, filters.categories, filters.regions, filters.years)
    agg = filtered.groupby(["Year","MonthNum","Month"], as_index=False).agg({"Sales":"sum"})
    agg = agg.sort_values(["Year","MonthNum"])
    result = {}
    for year, grp in agg.groupby("Year"):
        result[str(int(year))] = grp[["Month","Sales"]].to_dict(orient="records")
    return {"data": result}

@app.get("/api/download")
def download_all():
    if not os.path.exists(DATA_PATH):
        raise HTTPException(status_code=404, detail="Data file not found")
    return FileResponse(DATA_PATH, media_type="text/csv", filename="global_sales_cleaned.csv")

@app.post("/api/predict")
def predict(payload: dict):
    return {"prediction": None, "note": "No model deployed yet"}
