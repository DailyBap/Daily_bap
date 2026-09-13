// app/policies/page.tsx — Legal Boilerplates (Terms & Conditions, Refund & Privacy Policy)

import Link from "next/link";
import { ArrowLeft, ShieldCheck, FileText, RefreshCw, Lock, Mail } from "lucide-react";
import { siteConfig } from "@/config/brand";

export const metadata = {
  title: "Terms, Refund & Privacy Policies | Daily Bap",
  description: "Official Terms & Conditions, Refund & Cancellation Policy, and Privacy Policy for Daily Bap.",
};

export default function PoliciesPage() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-10">
        {/* Back Header */}
        <div className="flex items-center justify-between border-b border-gray-200 pb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-bold text-brand-primary hover:text-brand-accent transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" /> Official Store Policies
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-brand-primary">
            Policies & Terms of Service
          </h1>
          <p className="text-xs text-gray-500">
            Last Updated: September 13, 2026 • Daily Bap Korean Cloud Kitchen (Guwahati, Assam)
          </p>
        </div>

        {/* ======================================================== */}
        {/* 1. TERMS & CONDITIONS */}
        {/* ======================================================== */}
        <section className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-brand-primary border-b border-gray-100 pb-3">
            <FileText className="w-5 h-5" />
            <h2 className="font-display font-bold text-xl">Terms & Conditions</h2>
          </div>

          <p className="text-sm text-gray-600 leading-relaxed">
            Welcome to Daily Bap. By placing an order through our website, you agree to the following terms:
          </p>

          <div className="space-y-3 text-xs sm:text-sm text-gray-700">
            <div>
              <strong className="text-gray-900 block font-semibold mb-0.5">
                Service Availability:
              </strong>
              We operate as a cloud kitchen based in Guwahati, Assam. Our delivery services are restricted to specific radiuses. We reserve the right to reject orders that fall outside our maximum delivery zone (10km radius).
            </div>

            <div>
              <strong className="text-gray-900 block font-semibold mb-0.5">
                Order Fulfillment:
              </strong>
              All menu items are subject to availability. In the event an item is out of stock after an order is placed, we will contact you to offer a replacement or cancel the order.
            </div>

            <div>
              <strong className="text-gray-900 block font-semibold mb-0.5">
                Delivery Times:
              </strong>
              Estimated delivery times are indicative. External factors like traffic, weather, or heavy order volumes in Guwahati may cause delays.
            </div>

            <div>
              <strong className="text-gray-900 block font-semibold mb-0.5">
                Pricing:
              </strong>
              Prices are subject to change without prior notice. Delivery fees are calculated dynamically based on your distance from our kitchen.
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* 2. REFUND & CANCELLATION POLICY */}
        {/* ======================================================== */}
        <section className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-brand-primary border-b border-gray-100 pb-3">
            <RefreshCw className="w-5 h-5" />
            <h2 className="font-display font-bold text-xl">Refund & Cancellation Policy</h2>
          </div>

          <div className="space-y-3 text-xs sm:text-sm text-gray-700">
            <div>
              <strong className="text-gray-900 block font-semibold mb-0.5">
                Cancellations by Customer:
              </strong>
              Because our food is prepared fresh to order, cancellations must be made within 5 minutes of placing the order. Once the kitchen has started preparing your food, the order cannot be canceled or refunded.
            </div>

            <div>
              <strong className="text-gray-900 block font-semibold mb-0.5">
                Cancellations by Daily Bap:
              </strong>
              We reserve the right to cancel any order due to unavailable items, delivery constraints, or unforeseen circumstances. In such cases, a full refund will be initiated.
            </div>

            <div>
              <strong className="text-gray-900 block font-semibold mb-0.5">
                Refund Processing:
              </strong>
              For orders paid online (e.g., via UPI), refunds for accepted cancellations or failed orders will be processed back to the original payment method. Please allow 3-5 business days for the amount to reflect in your account, depending on your bank.
            </div>

            <div>
              <strong className="text-gray-900 block font-semibold mb-0.5">
                Food Quality Issues:
              </strong>
              If there is a genuine issue with the quality of your order or missing items, please contact us on WhatsApp on the same day with a photo of the food. We will review it and issue a partial or full replacement/refund at our discretion.
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* 3. PRIVACY POLICY */}
        {/* ======================================================== */}
        <section className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-brand-primary border-b border-gray-100 pb-3">
            <Lock className="w-5 h-5" />
            <h2 className="font-display font-bold text-xl">Privacy Policy</h2>
          </div>

          <div className="space-y-3 text-xs sm:text-sm text-gray-700">
            <div>
              <strong className="text-gray-900 block font-semibold mb-0.5">
                Data Collection:
              </strong>
              To process and deliver your order, we collect essential information including your name, phone number, delivery address, and precise location coordinates (if you use our map pin feature).
            </div>

            <div>
              <strong className="text-gray-900 block font-semibold mb-0.5">
                Data Usage:
              </strong>
              Your data is used exclusively to fulfill your order, calculate delivery fees, and communicate with you via WhatsApp regarding your order status.
            </div>

            <div>
              <strong className="text-gray-900 block font-semibold mb-0.5">
                Data Protection:
              </strong>
              We do not sell, rent, or share your personal information with third-party marketers. Your data is securely stored in our database for order management and customer service purposes.
            </div>

            <div className="pt-2 border-t border-gray-100">
              <strong className="text-gray-900 flex items-center gap-1.5 font-semibold mb-1">
                <Mail className="w-4 h-4 text-brand-primary" /> Contact Us:
              </strong>
              For any privacy-related concerns or to request the deletion of your data, please contact us at{" "}
              <a
                href="mailto:daily.bap@outlook.com"
                className="text-brand-primary font-bold hover:underline"
              >
                daily.bap@outlook.com
              </a>{" "}
              or message us directly on WhatsApp.
            </div>
          </div>
        </section>

        {/* Footer Link Back */}
        <div className="text-center pt-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-brand-primary transition-colors"
          >
            ← Return to Daily Bap Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
