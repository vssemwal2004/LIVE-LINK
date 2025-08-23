

#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>
#include <SPI.h>
#include <MFRC522.h>

// RFID Pins (NodeMCU)
#define SS_PIN 2   // D4
#define RST_PIN 0  // D3

MFRC522 mfrc522(SS_PIN, RST_PIN);
ESP8266WebServer server(80);

String lastUID = "";

// ⚠️ Replace with your WiFi credentials
const char* ssid = "Anubhav";
const char* password = "7088449687";

void handleRoot() {
  String page = "<h2>Doctor Panel</h2>";
  if (lastUID != "") {
    page += "<p><b>Last Scanned UID:</b> " + lastUID + "</p>";
  } else {
    page += "<p>No card scanned yet.</p>";
  }
  server.send(200, "text/html", page);
}

void handleGetUID() {
  server.sendHeader("Access-Control-Allow-Origin", "*"); // CORS ke liye zaroori hai taaki frontend access kar sake
  server.send(200, "text/plain", lastUID);
}

void setup() {
  Serial.begin(115200);
  SPI.begin();
  mfrc522.PCD_Init();

  // WiFi connect karo
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.print("Connected! IP: ");
  Serial.println(WiFi.localIP()); // Yeh IP note karo, frontend mein use karo

  server.on("/", handleRoot);
  server.on("/getUID", handleGetUID); // Yeh endpoint UID bhejta hai
  server.begin();
  Serial.println("Web server started!");
}

void loop() {
  server.handleClient();

  // RFID card check karo
  if (!mfrc522.PICC_IsNewCardPresent()) return;
  if (!mfrc522.PICC_ReadCardSerial()) return;

  lastUID = "";
  for (byte i = 0; i < mfrc522.uid.size; i++) {
    if (mfrc522.uid.uidByte[i] < 0x10) lastUID += "0";
    lastUID += String(mfrc522.uid.uidByte[i], HEX);
  }
  lastUID.toUpperCase();

  Serial.println("Scanned UID: " + lastUID); // Serial mein UID dikhega

  mfrc522.PICC_HaltA();
}