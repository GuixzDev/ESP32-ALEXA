const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const port = 3000;

// Middleware para processar JSON
app.use(bodyParser.json());

// Servir arquivos estáticos da pasta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Rota POST para gerar código .ino
app.post('/generate-code', (req, res) => {
  // Extrai dados do corpo da requisição
  const { wifiConfig, devices } = req.body;

  // Início do código .ino
  let code = `
#include <Arduino.h>
#include <ESP8266WiFi.h>
#include "fauxmoESP.h"\n\n`;

  // Definições de pinos para cada dispositivo
  devices.forEach(device => {
    code += `#define RELAY_PIN_${device.pin} ${device.pin}\n`;
  });

  // Configuração de rede WiFi
  code += `
#define SERIAL_BAUDRATE 115200\n
#define WIFI_SSID "${wifiConfig.ssid}"
#define WIFI_PASS "${wifiConfig.password}"\n\n`;

  // Definições de nomes dos dispositivos
  devices.forEach(device => {
    const deviceNameUpper = device.name.toUpperCase();
    code += `#define ${deviceNameUpper} "${device.name}"\n`;
  });

  // Configuração do fauxmoESP e WiFi
  code += `
fauxmoESP fauxmo;

void wifiSetup() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  while (WiFi.status() != WL_CONNECTED) {
    Serial.print(".");
    delay(100);
  }
  Serial.println();
  Serial.printf("[WIFI] STATION Mode, SSID: %s, IP address: %s", WiFi.SSID().c_str(), WiFi.localIP().toString().c_str());
}

void setup() {
  Serial.begin(SERIAL_BAUDRATE);
  Serial.println();
  wifiSetup();\n`;

  // Configuração de pinos e dispositivos fauxmo
  devices.forEach(device => {
    code += `  pinMode(RELAY_PIN_${device.pin}, OUTPUT);\n  digitalWrite(RELAY_PIN_${device.pin}, LOW);\n`;
  });

  code += `
  fauxmo.createServer(true);
  fauxmo.setPort(80);
  fauxmo.enable(true);\n\n`;

  // Adição de dispositivos fauxmo e lógica de controle
  devices.forEach(device => {
    const deviceNameUpper = device.name.toUpperCase();
    code += `  fauxmo.addDevice(${deviceNameUpper});\n`;
  });

  code += `
  fauxmo.onSetState([&](unsigned char device_id, const char * device_name, bool state, unsigned char value) {
    Serial.printf("[MAIN] Device #%d (%s) state: %s value: %d", device_id, device_name, state ? "ON" : "OFF", value);\n`;

  // Lógica de controle para cada dispositivo
  devices.forEach(device => {
    const deviceNameUpper = device.name.toUpperCase();
    code += `
    if (strcmp(device_name, ${deviceNameUpper}) == 0) {
      Serial.printf("RELAY ${device.pin} switched by Alexa\\n");
      if (state) {
        digitalWrite(RELAY_PIN_${device.pin}, HIGH);
      } else {
        digitalWrite(RELAY_PIN_${device.pin}, LOW);
      }
    }\n`;
  });

  code += `
  });
}

void loop() {
  fauxmo.handle();

  static unsigned long last = millis();
  if (millis() - last > 5000) {
    last = millis();
    Serial.printf("[MAIN] Free heap: %d bytes\\n", ESP.getFreeHeap());
  }
}
`;

  // Configuração do cabeçalho para download do arquivo .ino
  res.setHeader('Content-Disposition', 'attachment; filename="code.ino"');
  res.setHeader('Content-Type', 'text/plain');

  // Envio do código gerado como resposta
  res.send(code);
});

// Inicia o servidor na porta especificada
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
