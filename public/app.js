const app = new Vue({
  el: '#app',
  data: {
    wifiConfig: {
      ssid: '',
      password: '',
      passwordVisible: false
    },
    devices: [],
    submitted: false // Flag para indicar se o formulário foi submetido
  },
  methods: {
    addDevice() {
      this.devices.push({ name: '', pin: '' });
    },
    removeDevice(index) {
      this.devices.splice(index, 1);
    },
    togglePasswordVisibility() {
      this.wifiConfig.passwordVisible = !this.wifiConfig.passwordVisible;
    },
    generateCode() {
      // Marcando que o formulário foi submetido para ativar a validação visual
      this.submitted = true;

      // Validando os campos antes de gerar o código
      if (!this.validateInputs()) {
        return;
      }

      // Gerando código
      fetch('/generate-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          wifiConfig: this.wifiConfig,
          devices: this.devices
        })
      }).then(response => response.blob())
        .then(blob => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'code.ino';
          document.body.appendChild(a);
          a.click();
          a.remove();
        });
    },
    validateInputs() {
      // Validação SSID do WiFi
      if (!this.wifiConfig.ssid) {
        return false;
      }

      // Validação Senha do WiFi
      if (!this.wifiConfig.password) {
        return false;
      }

      // Validação dos dispositivos
      for (let i = 0; i < this.devices.length; i++) {
        if (!this.devices[i].name || !this.devices[i].pin) {
          return false;
        }
      }

      return true;
    }
  }
});
