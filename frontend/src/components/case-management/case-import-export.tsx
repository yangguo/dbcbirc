"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { DatePicker } from "@/components/ui/date-picker";

export function CaseImportExport() {
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const handleExport = async (fileType: "cbircsum" | "cbircdtl" | "cbirccat" | "cbircsplit") => {
    if (!startDate || !endDate) {
      alert("Please select a date range.");
      return;
    }

    try {
      const start = format(startDate, "yyyy-MM-dd");
      const end = format(endDate, "yyyy-MM-dd");
      const response = await fetch(
        `${API_BASE_URL}/api/v1/admin/export?file_type=${fileType}&start_date=${start}&end_date=${end}`
      );
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = "Failed to export data.";
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.detail || errorMessage;
        } catch {
          // If response is not JSON, use the text as error message
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }
  const blob = await response.blob();
  const formattedDate = format(new Date(), "yyyyMMdd");
  // Native download without external dependency
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${fileType}_${formattedDate}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed:", error);
      const errorMessage = error instanceof Error ? error.message : "Export failed. Please check the console for details.";
      alert(errorMessage);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>案例数据导出</CardTitle>
        <p className="text-sm text-muted-foreground">
          选择日期范围，导出不同格式的案例数据文件
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="start-date">开始日期</Label>
            <DatePicker
              date={startDate}
              onDateChange={setStartDate}
              placeholder="选择开始日期"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end-date">结束日期</Label>
            <DatePicker
              date={endDate}
              onDateChange={setEndDate}
              placeholder="选择结束日期"
            />
          </div>
        </div>
        
        {startDate && endDate && (
          <div className="rounded-md border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-950">
            <p className="text-sm text-green-800 dark:text-green-200">
              已选择时间范围：{format(startDate, "yyyy年MM月dd日")} 至 {format(endDate, "yyyy年MM月dd日")}
            </p>
          </div>
        )}
        
        <div className="space-y-4">
          <Label>导出格式</Label>
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            <Button 
              onClick={() => handleExport("cbircsum")} 
              disabled={!startDate || !endDate}
              variant="outline"
            >
              cbircsum
            </Button>
            <Button 
              onClick={() => handleExport("cbircdtl")} 
              disabled={!startDate || !endDate}
              variant="outline"
            >
              cbircdtl
            </Button>
            <Button 
              onClick={() => handleExport("cbirccat")} 
              disabled={!startDate || !endDate}
              variant="outline"
            >
              cbirccat
            </Button>
            <Button 
              onClick={() => handleExport("cbircsplit")} 
              disabled={!startDate || !endDate}
              variant="outline"
            >
              cbircsplit
            </Button>
          </div>
        </div>
        
        {(!startDate || !endDate) && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              请先选择开始日期和结束日期才能导出数据
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}