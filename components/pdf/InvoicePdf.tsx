import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica", color: "#1e293b" },
  header: { marginBottom: 16, borderBottom: 1, borderBottomColor: "#cbd5e1", paddingBottom: 10 },
  businessName: { fontSize: 18, fontWeight: 700, color: "#0f172a" },
  subHeader: { fontSize: 9, color: "#64748b", marginTop: 2 },
  docTitle: { fontSize: 16, fontWeight: 700, textAlign: "right", color: "#0f172a" },
  docBadge: { fontSize: 8, fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginTop: 2, textAlign: "right" },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  section: { marginBottom: 14, backgroundColor: "#f8fafc", padding: 10, borderRadius: 4 },
  sectionRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  table: { display: "flex", width: "100%", marginTop: 8 },
  tableRow: { flexDirection: "row", borderBottom: 1, borderBottomColor: "#f1f5f9", paddingVertical: 5 },
  tableHeaderRow: { flexDirection: "row", borderBottom: 1.5, borderBottomColor: "#cbd5e1", paddingVertical: 5, fontWeight: 700, color: "#334155" },
  colDescription: { width: "45%" },
  colQty: { width: "12%", textAlign: "right" },
  colPrice: { width: "20%", textAlign: "right" },
  colTotal: { width: "23%", textAlign: "right" },
  totalsBlock: { marginTop: 14, alignItems: "flex-end" },
  totalsRow: { flexDirection: "row", gap: 12, marginBottom: 3 },
  totalsLabel: { width: 120, textAlign: "right", color: "#475569" },
  totalsValue: { width: 90, textAlign: "right", color: "#0f172a" },
  note: { marginTop: 24, fontSize: 8.5, color: "#64748b", borderTop: 1, borderTopColor: "#e2e8f0", paddingTop: 8 },
});

export type InvoicePdfProps = {
  invoiceNumber: string;
  documentTitle?: string;
  documentSubtitle?: string;
  documentTypeLabel?: string;
  badgeLabel?: string;
  customer: { name: string; phone: string };
  vehicle?: { registrationNumber: string; make?: string; model?: string } | null;
  lineItems: { description: string; quantity: number; unitPrice: number; total: number }[];
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  total: number;
  note?: string;
};

function money(value: number) {
  return `৳${(value || 0).toFixed(2)}`;
}

export function InvoicePdf({
  invoiceNumber,
  documentTitle = "Invoice",
  documentSubtitle = "Car Workshop & Service Center",
  documentTypeLabel = "Invoice #",
  badgeLabel,
  customer,
  vehicle,
  lineItems,
  subtotal,
  discountPercent,
  discountAmount,
  total,
  note = "See attached warranty card if applicable.",
}: InvoicePdfProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.row}>
            <View>
              <Text style={styles.businessName}>Dhaka Automobiles</Text>
              <Text style={styles.subHeader}>{documentSubtitle}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.docTitle}>{documentTitle}</Text>
              {badgeLabel && <Text style={styles.docBadge}>{badgeLabel}</Text>}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={{ fontWeight: 700 }}>
              {documentTypeLabel}: {invoiceNumber}
            </Text>
            <Text>Date: {new Date().toLocaleDateString()}</Text>
          </View>
          <Text>Customer: {customer.name} ({customer.phone})</Text>
          {vehicle && (
            <Text>
              Vehicle: {vehicle.registrationNumber}
              {vehicle.make ? ` — ${vehicle.make} ${vehicle.model ?? ""}` : ""}
            </Text>
          )}
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={styles.colDescription}>Description</Text>
            <Text style={styles.colQty}>Qty</Text>
            <Text style={styles.colPrice}>Unit Price</Text>
            <Text style={styles.colTotal}>Total</Text>
          </View>
          {lineItems.map((item, index) => (
            <View style={styles.tableRow} key={index}>
              <Text style={styles.colDescription}>{item.description}</Text>
              <Text style={styles.colQty}>{item.quantity}</Text>
              <Text style={styles.colPrice}>{money(item.unitPrice)}</Text>
              <Text style={styles.colTotal}>{money(item.total)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totalsBlock}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Subtotal</Text>
            <Text style={styles.totalsValue}>{money(subtotal)}</Text>
          </View>
          {discountPercent > 0 && (
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Discount ({discountPercent}% on Service Charge)</Text>
              <Text style={styles.totalsValue}>-{money(discountAmount)}</Text>
            </View>
          )}
          <View style={styles.totalsRow}>
            <Text style={{ ...styles.totalsLabel, fontWeight: 700, fontSize: 11 }}>Total</Text>
            <Text style={{ ...styles.totalsValue, fontWeight: 700, fontSize: 11 }}>{money(total)}</Text>
          </View>
        </View>

        {note && <Text style={styles.note}>{note}</Text>}
      </Page>
    </Document>
  );
}
