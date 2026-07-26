import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica" },
  header: { marginBottom: 16, borderBottom: 1, paddingBottom: 8 },
  businessName: { fontSize: 18, fontWeight: 700 },
  section: { marginBottom: 12 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  itemRow: { flexDirection: "row", marginBottom: 2 },
  bullet: { width: 12 },
  terms: { marginTop: 16, fontSize: 9, color: "#444444" },
});

export type WarrantyCardPdfProps = {
  cardNumber: string;
  customer: { name: string; phone: string };
  vehicle?: { registrationNumber: string; make?: string; model?: string } | null;
  coveredItems: string[];
  startDate: string | Date;
  endDate: string | Date;
  terms?: string;
};

export function WarrantyCardPdf({
  cardNumber,
  customer,
  vehicle,
  coveredItems,
  startDate,
  endDate,
  terms,
}: WarrantyCardPdfProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.businessName}>Dhaka Automobiles</Text>
          <Text>Warranty Card</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.row}>
            <Text>Card #: {cardNumber}</Text>
            <Text>
              Valid: {new Date(startDate).toLocaleDateString()} —{" "}
              {new Date(endDate).toLocaleDateString()}
            </Text>
          </View>
          <Text>Customer: {customer.name} ({customer.phone})</Text>
          {vehicle && (
            <Text>
              Vehicle: {vehicle.registrationNumber}
              {vehicle.make ? ` — ${vehicle.make} ${vehicle.model ?? ""}` : ""}
            </Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={{ fontWeight: 700, marginBottom: 4 }}>Covered Items</Text>
          {coveredItems.map((item, index) => (
            <View style={styles.itemRow} key={index}>
              <Text style={styles.bullet}>•</Text>
              <Text>{item}</Text>
            </View>
          ))}
        </View>

        {terms && <Text style={styles.terms}>{terms}</Text>}
      </Page>
    </Document>
  );
}
