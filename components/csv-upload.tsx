"use client";

import type React from "react";
import { useState, useCallback } from "react";

import { Upload, X, AlertTriangle } from "lucide-react";
import Papa from "papaparse";

import { Button } from "@/components/ui/button";
import { csvLogger } from "@/lib/client-logger";
import type { CSVRow } from "@/types/email";

// Maximum file size in bytes (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;
// Maximum number of rows to process at once
const MAX_ROWS = 50000;
// Chunk size for processing large files
const CHUNK_SIZE = 1000;

interface CSVUploadProps {
  onDataLoad: (data: CSVRow[]) => void;
  csvData: CSVRow[];
}

export function CSVUpload({ onDataLoad, csvData }: CSVUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [warning, setWarning] = useState<string | null>(null);

  const processChunk = useCallback(
    (
      rows: CSVRow[],
      emailKey: string,
      accumulatedRows: CSVRow[],
      onComplete: (validRows: CSVRow[]) => void,
    ) => {
      // Process rows in chunks to avoid blocking the main thread
      const processNextChunk = (startIndex: number) => {
        const endIndex = Math.min(startIndex + CHUNK_SIZE, rows.length);

        for (let i = startIndex; i < endIndex; i++) {
          const row = rows[i];
          if (!row || typeof row !== "object") {
            continue;
          }

          // Create normalized row with 'email' key
          const normalizedRow: CSVRow = { ...row };
          if (emailKey !== "email" && row[emailKey as keyof CSVRow]) {
            normalizedRow.email = row[emailKey as keyof CSVRow] as string;
          }
          // Ensure email field exists
          if (!normalizedRow.email) {
            normalizedRow.email = "";
          }

          const email = normalizedRow.email;
          if (
            email &&
            typeof email === "string" &&
            email.trim().length > 0 &&
            email.includes("@")
          ) {
            accumulatedRows.push(normalizedRow);
          }
        }

        setProgress(Math.round((endIndex / rows.length) * 100));

        if (endIndex < rows.length) {
          // Schedule next chunk with requestAnimationFrame to keep UI responsive
          requestAnimationFrame(() => processNextChunk(endIndex));
        } else {
          onComplete(accumulatedRows);
        }
      };

      processNextChunk(0);
    },
    [],
  );

  const handleFileUpload = (file: File) => {
    setError(null);
    setWarning(null);
    setProgress(0);

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      setError(
        `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB.`,
      );
      return;
    }

    setIsProcessing(true);

    Papa.parse(file, {
      complete: (results) => {
        try {
          csvLogger.debug("CSV parse results", {
            rowCount: results.data?.length,
            errors: results.errors?.length,
          });

          if (results.errors && results.errors.length > 0) {
            csvLogger.error("CSV parsing errors", undefined, {
              errors: results.errors,
            });
            setError(`CSV parsing errors: ${results.errors.map((e) => e.message).join(", ")}`);
            return;
          }

          const data = results.data as any[];
          csvLogger.debug("Raw CSV data loaded", { rowCount: data?.length });

          if (!data || data.length === 0) {
            setError("No data found in CSV file");
            return;
          }

          // Find the email column with case-insensitive matching
          const firstRow = data[0];
          if (!firstRow || typeof firstRow !== "object") {
            setError("Invalid CSV format");
            return;
          }

          // Look for email column with different case variations
          const emailColumns = [
            "email",
            "Email",
            "EMAIL",
            "e-mail",
            "E-mail",
            "E-Mail",
            "email_address",
            "Email_Address",
            "emailaddress",
          ];
          let emailKey: string | null = null;

          csvLogger.debug("Available columns", {
            columns: Object.keys(firstRow),
          });

          for (const key of Object.keys(firstRow)) {
            const normalizedKey = key.toLowerCase().trim();
            if (
              emailColumns.some((col) => col.toLowerCase() === normalizedKey) ||
              normalizedKey.includes("email") ||
              normalizedKey.includes("mail")
            ) {
              emailKey = key;
              break;
            }
          }

          if (!emailKey) {
            const availableColumns = Object.keys(firstRow).join(", ");
            setError(
              `No email column found. Available columns: ${availableColumns}. Please make sure your CSV has a column named 'email', 'Email', 'EMAIL', or similar.`,
            );
            return;
          }

          csvLogger.debug("Found email column", { emailKey });

          // Check row count and warn if large
          if (data.length > MAX_ROWS) {
            setWarning(
              `Large file detected. Processing first ${MAX_ROWS.toLocaleString()} rows only.`,
            );
            data.length = MAX_ROWS;
          }

          // Use chunked processing for better memory management
          const accumulatedRows: CSVRow[] = [];
          processChunk(data as CSVRow[], emailKey, accumulatedRows, (validRows) => {
            setIsProcessing(false);
            setProgress(100);

            csvLogger.debug("Valid CSV rows", { count: validRows.length });

            if (validRows.length === 0) {
              setError(
                `No valid email addresses found. Found column "${emailKey}" but no valid email addresses. Make sure emails contain @ symbol.`,
              );
              return;
            }

            onDataLoad(validRows);
            csvLogger.info(`Successfully loaded contacts from CSV`, {
              count: validRows.length,
            });
          });
        } catch (err) {
          setIsProcessing(false);
          csvLogger.error("Error processing CSV", err instanceof Error ? err : undefined);
          setError("Error processing CSV file");
        }
      },
      header: true,
      skipEmptyLines: true,
      error: (error) => {
        setIsProcessing(false);
        csvLogger.error("Papa Parse error", error instanceof Error ? error : undefined);
        setError(`Failed to parse CSV: ${error.message}`);
      },
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const csvFile = files.find((file) => file.type === "text/csv" || file.name.endsWith(".csv"));

    if (csvFile) {
      handleFileUpload(csvFile);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  return (
    <div className="w-full">
      {error && (
        <div className="mb-3 p-2 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-xs text-red-500 dark:text-red-400 underline mt-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {warning && (
        <div className="mb-3 p-2 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-yellow-600 dark:text-yellow-400">{warning}</p>
            <button
              onClick={() => setWarning(null)}
              className="text-xs text-yellow-500 dark:text-yellow-400 underline mt-1"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {isProcessing && (
        <div className="mb-3 p-2 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-blue-600 dark:text-blue-400">Processing CSV...</p>
            <span className="text-xs text-blue-600 dark:text-blue-400">{progress}%</span>
          </div>
          <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-1.5">
            <div
              className="bg-blue-600 dark:bg-blue-400 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {csvData.length === 0 ? (
        <div
          className={`border-2 border-dashed rounded-lg p-3 text-center transition-colors ${
            isDragging
              ? "border-blue-400 bg-blue-50 dark:bg-blue-900/30"
              : "border-gray-300 dark:border-gray-600"
          } ${isProcessing ? "opacity-50 pointer-events-none" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <Upload className="h-6 w-6 mx-auto mb-2 text-gray-400 dark:text-gray-500" />
          <p className="text-xs font-medium mb-1">Upload CSV File</p>
          <p className="text-[10px] text-gray-600 dark:text-gray-400 mb-2">
            Drag and drop your CSV file here, or click to browse
          </p>
          <p className="text-[10px] text-gray-500 dark:text-gray-500 mb-2">
            Max file size: {MAX_FILE_SIZE / 1024 / 1024}MB • Max rows: {MAX_ROWS.toLocaleString()}
          </p>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileInput}
            className="hidden"
            id="csv-upload"
            disabled={isProcessing}
          />
          <Button asChild size="sm" className="h-7" disabled={isProcessing}>
            <label htmlFor="csv-upload" className="cursor-pointer text-xs">
              {isProcessing ? "Processing..." : "Choose File"}
            </label>
          </Button>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {csvData.length} recipients loaded
            </p>
            <Button variant="outline" size="sm" onClick={() => onDataLoad([])} className="h-6 px-2">
              <X className="h-3 w-3 mr-1" />
              <span className="text-[10px]">Clear</span>
            </Button>
          </div>
          <div className="bg-gray-50 dark:bg-zinc-800 rounded p-2 max-h-24 overflow-y-auto">
            <div className="text-[10px] font-medium text-gray-700 dark:text-gray-300 mb-1">
              Available placeholders:{" "}
              {Object.keys(csvData[0] || {})
                .map((key) => `{{${key}}}`)
                .join(", ")}
            </div>
            <div className="space-y-1">
              {csvData.slice(0, 2).map((row, index) => (
                <div key={index} className="text-[10px] text-gray-600 dark:text-gray-400 truncate">
                  {row.email} -{" "}
                  {Object.entries(row)
                    .filter(([key]) => key !== "email")
                    .map(([key, value]) => `${key}: ${value}`)
                    .join(", ")}
                </div>
              ))}
              {csvData.length > 2 && (
                <div className="text-[10px] text-gray-500 dark:text-gray-500">
                  ... and {csvData.length - 2} more
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/30 rounded text-center">
        <p className="text-[10px] text-blue-800 dark:text-blue-200">
          💡 <strong>Tip:</strong> Your CSV should have an "email" column and any other fields you
          want to personalize.
        </p>
      </div>
    </div>
  );
}
