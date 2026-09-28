import * as QRCode from 'qrcode';

const url = 'http://192.168.118.40:5173/pqrs';
QRCode.toFile('../pqrs_qr.png', url, {
  color: {
    dark: '#000000',
    light: '#ffffff'
  },
  width: 500
}, (err) => {
  if (err) throw err;
  console.log('QR Code generated at pqrs_qr.png');
});
