import type { GLMapping, StaffMember } from "@/types";

export const GL_CODES: GLMapping[] = [
  { gl_account_code: "4010", gl_account_name: "Food Cost", department: "Kitchen", budget_monthly: 45000 },
  { gl_account_code: "4020", gl_account_name: "Beverage Cost", department: "Bar", budget_monthly: 15000 },
  { gl_account_code: "4030", gl_account_name: "Non-Alcoholic Beverage", department: "Bar", budget_monthly: 5000 },
  { gl_account_code: "5020", gl_account_name: "Guest Room Supplies", department: "Rooms", budget_monthly: 8000 },
  { gl_account_code: "5030", gl_account_name: "Housekeeping Supplies", department: "Housekeeping", budget_monthly: 6000 },
  { gl_account_code: "5040", gl_account_name: "Linen & Laundry", department: "Rooms", budget_monthly: 4000 },
  { gl_account_code: "6010", gl_account_name: "Repairs & Maintenance", department: "Maintenance", budget_monthly: 7000 },
  { gl_account_code: "6500", gl_account_name: "Office Supplies", department: "Admin", budget_monthly: 2000 },
  { gl_account_code: "7010", gl_account_name: "Spa Supplies", department: "Spa", budget_monthly: 3500 },
];

export const APPROVAL_TIERS = [
  { max: 500, approver: "Auto-approved", description: "Sent to vendor immediately" },
  { max: 2000, approver: "Department Head", description: "Approval required" },
  { max: 5000, approver: "Controller", description: "Approval required" },
  { max: Infinity, approver: "Controller + GM", description: "Sequential approval" },
] as const;

export const STAFF: StaffMember[] = [
  { name: "Vasilije", department: "Kuhinja", pin: "1234" },
  { name: "Biljana", department: "Housekeeping", pin: "5678" },
  { name: "Filip", department: "IT", pin: "9012" },
  { name: "Zoran Radonjic", department: "Finansije", pin: "3456" },
  { name: "Marko", department: "Bar", pin: "2222" },
  { name: "Ivana", department: "Maintenance", pin: "3333" },
  { name: "Ana", department: "Spa", pin: "4444" },
  { name: "Senad", department: "Admin", pin: "5555" },
];

export const DEPARTMENTS = [
  "Kitchen",
  "Bar",
  "Rooms",
  "Housekeeping",
  "Maintenance",
  "Admin",
  "Spa",
] as const;

export const WAREHOUSES = [
  "Kuhinja",
  "Centralni magacin",
  "\u0160ank",
  "Housekeeping",
] as const;

export const INVENTORY_CATEGORIES = [
  "Meso",
  "Riba",
  "Vo\u0107e/Povr\u0107e",
  "Mlijeko/Mlje\u010Dni proizvodi",
  "Pi\u0107a",
  "Suha roba",
  "\u010Cisto\u0107a",
  "Postelja/Rublje",
  "Ostalo",
] as const;

export const PO_STATUSES = [
  "All",
  "Pending Approval",
  "Approved",
  "Sent to Vendor",
  "Partially Received",
  "Fully Received",
  "Closed",
  "Cancelled",
] as const;

export const MATCH_STATUSES = [
  "All",
  "Perfect Match",
  "Minor",
  "Major",
  "Disputed",
  "Pending Review",
] as const;

export const WEBHOOK_URL = process.env.NEXT_PUBLIC_RECEIVING_WEBHOOK_URL || "http://localhost:5678/webhook/receiving";
