import { describe, expect, it } from "vitest";
import { parseCsv } from "../data/csv";

const header = "Order ID,Date,Equity Balance ($),Product,Position Size ($),RiskPerTrade ($),Profit/Loss ($),Profit/Loss (%)";

describe("CSV validation", () => {
  it("normalizes aliases and sorts chronologically", () => {
    const result = parseCsv(`${header}\n2,2025-01-02,1010,BTC,100,10,10,1\n1,2025-01-01,1000,BTC,100,10,-10,-1`);
    expect(result.trades.map((trade) => trade.orderId)).toEqual(["1", "2"]);
    expect(result.issues.some((issue) => issue.code === "SPARSE")).toBe(true);
  });

  it("rejects duplicate order IDs", () => {
    const result = parseCsv(`${header}\n1,2025-01-01,1000,BTC,100,10,10,1\n1,2025-01-02,1010,BTC,100,10,10,1`);
    expect(result.trades).toHaveLength(1);
    expect(result.issues.some((issue) => issue.code === "DUPLICATE_ID" && issue.severity === "error")).toBe(true);
  });
});
