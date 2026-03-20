export type Plan =
  | "free"
  | "pro_monthly"
  | "pro_quarterly"
  | "pro_annual"
  | "biz_monthly"
  | "biz_quarterly"
  | "biz_annual";

export type Locale = "ph" | "intl";
export type PaymentGateway = "paymongo";
export type PaymentStatus = "succeeded" | "failed" | "refunded";

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  plan: Plan;
  plan_expires_at: string | null; // ISO 8601
  payment_gateway: PaymentGateway | null;
  gateway_customer_id: string | null;
  gateway_subscription_id: string | null;
  storage_used: number; // bytes
  locale: Locale;
  created_at: string;
  updated_at: string;
};

export type Project = {
  id: string;
  user_id: string;
  name: string;
  objects: import("@/app/sandbox/types").CanvasObject[];
  canvas_width: number;
  canvas_height: number;
  columns: string[];
  data_images_label: string | null;
  data_file_path: string | null;
  paper_size: string;
  row_count: number;
  created_at: string;
  updated_at: string;
};

export type Payment = {
  id: string;
  user_id: string;
  gateway: PaymentGateway;
  gateway_payment_id: string;
  gateway_subscription_id: string | null;
  amount: number;
  currency: "PHP";
  plan: Exclude<Plan, "free">;
  status: PaymentStatus;
  metadata: Record<string, unknown> | null;
  created_at: string;
};
