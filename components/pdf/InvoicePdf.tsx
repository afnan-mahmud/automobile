import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica" },
  header: { marginBottom: 16, borderBottom: 1, paddingBottom: 8 },
  businessName: { fontSize: 18, fontWeight: 700 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  section: { marginBottom: 12 },
  table: { display: "flex", width: "100%", marginTop: 8 },
  tableRow: { flexDirection: "row", borderBottom: 1, borderBottomColor: "#e5e5e5", paddingVertical: 4 },
  tableHeaderRow: { flexDirection: "row", borderBottom: 1, paddingVertical: 4, fontWeight: 700 },
  colDescription: { width: "40%" },
  colQty: { width: "15%", textAlign: "right" },
  colPrice: { width: "20%", textAlign: "right" },
  colTotal: { width: "25%", textAlign: "right" },
  totalsBlock: { marginTop: 12, alignItems: "flex-end" },
  totalsRow: { flexDirection: "row", gap: 12, marginBottom: 2 },
  totalsLabel: { width: 100, textAlign: "right" },
  totalsValue: { width: 80, textAlign: "right" },
  note: { marginTop: 24, fontSize: 9, color: "#666666" },
});

export type InvoicePdfProps = {
  invoiceNumber: string;
  customer: { name: string; phone: string };
  vehicle?: { registrationNumber: string; make?: string; model?: string } | null;
  lineItems: { description: string; quantity: number; unitPrice: number; total: number }[];
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  total: number;
};

function money(value: number) {
  return `৳${value.toFixed(2)}`;
}

export function InvoicePdf({
  invoiceNumber,
  customer,
  vehicle,
  lineItems,
  subtotal,
  discountPercent,
  discountAmount,
  total,
}: InvoicePdfProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.businessName}>Dhaka Automobiles</Text>
          <Text>Car Workshop &amp; Service Center</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.row}>
            <Text>Invoice #: {invoiceNumber}</Text>
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
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Discount ({discountPercent}%)</Text>
            <Text style={styles.totalsValue}>-{money(discountAmount)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={{ ...styles.totalsLabel, fontWeight: 700 }}>Total</Text>
            <Text style={{ ...styles.totalsValue, fontWeight: 700 }}>{money(total)}</Text>
          </View>
        </View>

        <Text style={styles.note}>See attached warranty card if applicable.</Text>
      </Page>
    </Document>
  );
}
