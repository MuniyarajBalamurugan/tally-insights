import AsyncStorage from "@react-native-async-storage/async-storage";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity } from "react-native";
import { BarChart } from "react-native-chart-kit";
import XLSX from "xlsx";

export default function Dashboard() {
  const [username, setUsername] = useState("");
  const [data, setData] = useState([]);
  const router = useRouter();

  useEffect(() => {
    AsyncStorage.getItem("username").then(user => {
      if (user) setUsername(user);
    });
  }, []);

  const handleLogout = async () => {
    await AsyncStorage.removeItem("username");
    router.replace("/login");
  };

  const handleUpload = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });

      if (res.canceled) return;

      const file = res.assets[0];
      const fileUri = file.uri.trim();

      const fileString = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.Base64 });

      const workbook = XLSX.read(fileString, { type: "base64" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet).map(row => {
        const normalized = {};
        for (let key in row) {
          const newKey = key.trim();
          normalized[newKey] = !isNaN(row[key]) && row[key] !== "" ? Number(row[key]) : row[key];
        }
        return normalized;
      });

      if (jsonData.length === 0) {
        Alert.alert("Empty file", "No data found in Excel.");
        return;
      }

      setData(jsonData);
    } catch (err) {
      console.error(err);
      Alert.alert("Upload Failed", "Cannot read this file. Try another one.");
    }
  };

  const chartData = {
    labels: data.map(item => item["Item Name"] || ""),
    datasets: [{ data: data.map(item => item["Closing Qty"] || 0) }],
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.welcome}>Hi {username}</Text>
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.uploadButton} onPress={handleUpload}>
        <Text style={styles.uploadText}>Upload Excel</Text>
      </TouchableOpacity>

      {data.length > 0 && (
        <>
          <Text style={styles.chartTitle}>Stock Closing Qty</Text>
          <BarChart
            data={chartData}
            width={Dimensions.get("window").width - 40}
            height={250}
            chartConfig={{
              backgroundColor: "#f0f8ff",
              backgroundGradientFrom: "#f0f8ff",
              backgroundGradientTo: "#f0f8ff",
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(74, 144, 226, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            }}
            style={{ marginVertical: 10, borderRadius: 8 }}
          />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#f0f8ff" },
  welcome: { fontSize: 28, fontWeight: "bold", marginBottom: 20, color: "#333" },
  logoutButton: { backgroundColor: "#ff4d4d", padding: 12, borderRadius: 8, marginBottom: 20, alignItems: "center" },
  logoutText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  uploadButton: { backgroundColor: "#4a90e2", padding: 12, borderRadius: 8, marginBottom: 20, alignItems: "center" },
  uploadText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  chartTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 10, textAlign: "center" },
});
